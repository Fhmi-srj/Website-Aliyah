<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AbsensiRapat;
use App\Models\AbsensiKegiatan;
use App\Models\Rapat;
use App\Models\Kegiatan;
use App\Models\Siswa;
use App\Models\Kelas;
use App\Models\Guru;
use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Carbon;

class AdminAbsensiController extends Controller
{
    /**
     * Get absensi data for a rapat (admin - no role restriction).
     * Returns default structure with peserta list if no absensi exists yet.
     */
    public function getAbsensiRapat($rapatId): JsonResponse
    {
        $rapat = Rapat::with(['pimpinanGuru:id,nama', 'sekretarisGuru:id,nama'])->find($rapatId);
        if (!$rapat) {
            return response()->json(['error' => 'Rapat tidak ditemukan'], 404);
        }

        // Get valid guru IDs (exclude 'Semua Guru' placeholder and pimpinan/sekretaris to avoid duplicates)
        $rapatPesertaIds = $rapat->peserta_rapat ?? [];
        $excludeIds = array_filter([$rapat->pimpinan_id, $rapat->sekretaris_id]);
        $validGurus = Guru::whereIn('id', $rapatPesertaIds)
            ->where('nama', '!=', 'Semua Guru')
            ->whereNotIn('id', $excludeIds)
            ->get(['id', 'nama']);

        $absensi = AbsensiRapat::where('rapat_id', $rapatId)->first();

        // Build pimpinan & sekretaris entries
        $pimpinanEntry = null;
        if ($rapat->pimpinan_id && $rapat->pimpinanGuru) {
            $pimpinanEntry = [
                'guru_id' => $rapat->pimpinan_id,
                'nama' => $rapat->pimpinanGuru->nama,
                'role' => 'Pimpinan',
                'status' => $absensi ? ($absensi->pimpinan_status ?? 'H') : 'H',
                'keterangan' => $absensi ? ($absensi->pimpinan_keterangan ?? '') : '',
            ];
        }
        $sekretarisEntry = null;
        if ($rapat->sekretaris_id && $rapat->sekretarisGuru) {
            $sekretarisEntry = [
                'guru_id' => $rapat->sekretaris_id,
                'nama' => $rapat->sekretarisGuru->nama,
                'role' => 'Sekretaris',
                'status' => $absensi ? ($absensi->sekretaris_status ?? 'H') : 'H',
                'keterangan' => $absensi ? ($absensi->sekretaris_keterangan ?? '') : '',
            ];
        }

        if (!$absensi) {
            // No absensi record yet - return default structure with peserta list
            $defaultPeserta = $validGurus->map(fn($g) => [
                'guru_id' => $g->id,
                'nama' => $g->nama,
                'role' => 'Peserta',
                'status' => 'H',
                'keterangan' => '',
            ])->values()->toArray();

            // Prepend pimpinan & sekretaris
            $allPeserta = [];
            if ($pimpinanEntry)
                $allPeserta[] = $pimpinanEntry;
            if ($sekretarisEntry)
                $allPeserta[] = $sekretarisEntry;
            $allPeserta = array_merge($allPeserta, $defaultPeserta);

            return response()->json([
                'success' => true,
                'has_absensi' => false,
                'data' => [
                    'id' => null,
                    'tanggal' => Carbon::parse($rapat->tanggal)->format('Y-m-d'),
                    'absensi_peserta' => $allPeserta,
                    'notulensi' => '',
                    'foto_rapat' => [],
                    'peserta_eksternal' => $rapat->peserta_eksternal ?? [],
                    'status' => 'draft',
                ]
            ]);
        }

        // Merge absensi_peserta with full peserta list (include all valid guru)
        $validGuruIds = $validGurus->pluck('id')->toArray();
        $existingPeserta = collect($absensi->absensi_peserta ?? [])->keyBy('guru_id');
        $mergedPeserta = collect($validGuruIds)->map(function ($guruId) use ($existingPeserta, $validGurus) {
            $guru = $validGurus->firstWhere('id', $guruId);
            if ($existingPeserta->has($guruId)) {
                $entry = $existingPeserta->get($guruId);
                $entry['nama'] = $guru ? $guru->nama : '';
                $entry['role'] = 'Peserta';
                return $entry;
            }
            return [
                'guru_id' => $guruId,
                'nama' => $guru ? $guru->nama : '',
                'role' => 'Peserta',
                'status' => 'H',
                'keterangan' => '',
            ];
        })->values()->toArray();

        // Prepend pimpinan & sekretaris
        $allPeserta = [];
        if ($pimpinanEntry)
            $allPeserta[] = $pimpinanEntry;
        if ($sekretarisEntry)
            $allPeserta[] = $sekretarisEntry;
        $allPeserta = array_merge($allPeserta, $mergedPeserta);

        return response()->json([
            'success' => true,
            'has_absensi' => true,
            'data' => [
                'id' => $absensi->id,
                'tanggal' => $absensi->tanggal,
                'absensi_peserta' => $allPeserta,
                'notulensi' => $absensi->notulensi,
                'foto_rapat' => $absensi->foto_rapat ?? [],
                'peserta_eksternal' => $rapat->peserta_eksternal ?? [],
                'status' => $absensi->status,
            ]
        ]);
    }

    /**
     * Update or create absensi data for a rapat (admin - full edit).
     */
    public function updateAbsensiRapat(Request $request, $rapatId): JsonResponse
    {
        $rapat = Rapat::find($rapatId);
        if (!$rapat) {
            return response()->json(['error' => 'Rapat tidak ditemukan'], 404);
        }

        $validated = $request->validate([
            'absensi_peserta' => 'nullable|array',
            'absensi_peserta.*.guru_id' => 'required|integer',
            'absensi_peserta.*.status' => 'required|in:H,S,I,A',
            'absensi_peserta.*.keterangan' => 'nullable|string',
            'absensi_peserta.*.role' => 'nullable|string',
            'notulensi' => 'nullable|string',
            'foto_rapat' => 'nullable|array',
            'peserta_eksternal' => 'nullable|array',
            'peserta_eksternal.*.nama' => 'required|string|max:100',
            'peserta_eksternal.*.jabatan' => 'nullable|string|max:100',
            'peserta_eksternal.*.ttd' => 'nullable|string', // Base64 canvas TTD
            'peserta_eksternal.*.status' => 'nullable|string|max:50',
        ]);

        // Save tamu TTDs as files and update peserta_eksternal with file paths
        if (array_key_exists('peserta_eksternal', $validated)) {
            $pesertaEksternal = $validated['peserta_eksternal'];
            foreach ($pesertaEksternal as $idx => &$pe) {
                if (!empty($pe['ttd']) && preg_match('/^data:image/', $pe['ttd'])) {
                    $base64 = preg_replace('/^data:image\/\w+;base64,/', '', $pe['ttd']);
                    $imageData = base64_decode($base64);
                    if ($imageData) {
                        $filename = 'ttd_tamu_' . $rapatId . '_' . $idx . '_' . time() . '.png';
                        $path = 'ttd/tamu/' . $filename;
                        \Storage::disk('public')->put($path, $imageData);
                        $pe['ttd'] = asset('storage/' . $path);
                    }
                }
            }
            unset($pe);
            $rapat->update(['peserta_eksternal' => $pesertaEksternal]);
        }

        // Separate pimpinan/sekretaris from regular peserta
        $allPeserta = $validated['absensi_peserta'] ?? [];
        $pimpinanData = null;
        $sekretarisData = null;
        $regularPeserta = [];
        foreach ($allPeserta as $p) {
            if (($p['role'] ?? '') === 'Pimpinan') {
                $pimpinanData = $p;
            } elseif (($p['role'] ?? '') === 'Sekretaris') {
                $sekretarisData = $p;
            } else {
                $regularPeserta[] = [
                    'guru_id' => $p['guru_id'],
                    'status' => $p['status'],
                    'keterangan' => $p['keterangan'] ?? null,
                ];
            }
        }

        $absensi = AbsensiRapat::where('rapat_id', $rapatId)->first();

        if ($absensi) {
            // Update existing
            $oldValues = $absensi->getOriginal();
            $updateData = [
                'absensi_peserta' => $regularPeserta,
                'notulensi' => $validated['notulensi'] ?? $absensi->notulensi,
                'foto_rapat' => array_key_exists('foto_rapat', $validated) ? $validated['foto_rapat'] : $absensi->foto_rapat,
                'status' => 'submitted',
            ];
            if ($pimpinanData) {
                $updateData['pimpinan_status'] = $pimpinanData['status'];
                $updateData['pimpinan_keterangan'] = $pimpinanData['keterangan'] ?? null;
            }
            if ($sekretarisData) {
                $updateData['sekretaris_status'] = $sekretarisData['status'];
                $updateData['sekretaris_keterangan'] = $sekretarisData['keterangan'] ?? null;
            }
            $absensi->update($updateData);
            ActivityLog::logUpdate($absensi, $oldValues, "Admin mengubah absensi rapat: {$rapat->agenda_rapat}");
        } else {
            // Create new absensi record
            $absensi = AbsensiRapat::create([
                'rapat_id' => $rapatId,
                'tanggal' => Carbon::parse($rapat->tanggal)->format('Y-m-d'),
                'pimpinan_status' => $pimpinanData ? $pimpinanData['status'] : 'H',
                'pimpinan_keterangan' => $pimpinanData ? ($pimpinanData['keterangan'] ?? null) : null,
                'sekretaris_status' => $sekretarisData ? $sekretarisData['status'] : 'H',
                'sekretaris_keterangan' => $sekretarisData ? ($sekretarisData['keterangan'] ?? null) : null,
                'absensi_peserta' => $regularPeserta,
                'notulensi' => $validated['notulensi'] ?? null,
                'foto_rapat' => $validated['foto_rapat'] ?? [],
                'status' => 'submitted',
            ]);
            ActivityLog::logCreate($absensi, "Admin membuat absensi rapat: {$rapat->agenda_rapat}");
        }

        return response()->json([
            'success' => true,
            'message' => 'Absensi rapat berhasil disimpan',
            'data' => $absensi->fresh()
        ]);
    }

    /**
     * Get absensi data for a kegiatan (admin - no role restriction).
     * Returns default structure with pendamping list if no absensi exists yet.
     */
    public function getAbsensiKegiatan($kegiatanId): JsonResponse
    {
        $kegiatan = Kegiatan::with(['penanggungjawab:id,nama'])->find($kegiatanId);
        if (!$kegiatan) {
            return response()->json(['error' => 'Kegiatan tidak ditemukan'], 404);
        }

        // Get valid guru IDs (exclude 'Semua Guru' placeholder)
        $kegiatanPendampingIds = $kegiatan->guru_pendamping ?? [];
        $validGurus = Guru::whereIn('id', $kegiatanPendampingIds)
            ->where('nama', '!=', 'Semua Guru')
            ->get(['id', 'nama']);

        // Build siswa list from kelas_peserta
        $siswaList = [];
        $kelasPeserta = $kegiatan->kelas_peserta ?? [];
        if (!empty($kelasPeserta)) {
            $siswaList = Siswa::whereIn('kelas_id', $kelasPeserta)
                ->select('id', 'nama', 'nis', 'kelas_id')
                ->orderBy('nama')
                ->get()
                ->map(function ($s) {
                    $kelas = Kelas::find($s->kelas_id);
                    return [
                        'siswa_id' => $s->id,
                        'nama' => $s->nama,
                        'nis' => $s->nis,
                        'kelas' => $kelas ? $kelas->nama_kelas : '-',
                    ];
                })->toArray();
        }

        $absensi = AbsensiKegiatan::where('kegiatan_id', $kegiatanId)->first();

        if (!$absensi) {
            // No absensi record yet - return default structure with pendamping list
            $defaultPendamping = $validGurus->map(fn($g) => [
                'guru_id' => $g->id,
                'status' => 'H',
                'keterangan' => '',
            ])->values()->toArray();

            // Default siswa absensi: all hadir
            $defaultSiswa = collect($siswaList)->map(fn($s) => [
                'siswa_id' => $s['siswa_id'],
                'status' => 'H',
                'keterangan' => '',
            ])->toArray();

            return response()->json([
                'success' => true,
                'has_absensi' => false,
                'siswa_list' => $siswaList,
                'data' => [
                    'id' => null,
                    'tanggal' => $kegiatan->waktu_mulai ? Carbon::parse($kegiatan->waktu_mulai)->format('Y-m-d') : now()->format('Y-m-d'),
                    'pj_status' => 'H',
                    'pj_keterangan' => '',
                    'absensi_pendamping' => $defaultPendamping,
                    'absensi_siswa' => $defaultSiswa,
                    'berita_acara' => '',
                    'foto_kegiatan' => [],
                    'status' => 'draft',
                ]
            ]);
        }

        // Merge absensi_pendamping with full pendamping list (include all valid guru)
        $validGuruIds = $validGurus->pluck('id')->toArray();
        $existingPendamping = collect($absensi->absensi_pendamping ?? [])->keyBy('guru_id');
        $mergedPendamping = collect($validGuruIds)->map(function ($guruId) use ($existingPendamping) {
            if ($existingPendamping->has($guruId)) {
                return $existingPendamping->get($guruId);
            }
            return [
                'guru_id' => $guruId,
                'status' => 'H',
                'keterangan' => '',
            ];
        })->values()->toArray();

        return response()->json([
            'success' => true,
            'has_absensi' => true,
            'siswa_list' => $siswaList,
            'data' => [
                'id' => $absensi->id,
                'tanggal' => $absensi->tanggal,
                'pj_status' => $absensi->pj_status,
                'pj_keterangan' => $absensi->pj_keterangan,
                'absensi_pendamping' => $mergedPendamping,
                'absensi_siswa' => $absensi->absensi_siswa ?? [],
                'berita_acara' => $absensi->berita_acara,
                'foto_kegiatan' => $absensi->foto_kegiatan ?? [],
                'status' => $absensi->status,
            ]
        ]);
    }

    /**
     * Update or create absensi data for a kegiatan (admin - full edit).
     */
    public function updateAbsensiKegiatan(Request $request, $kegiatanId): JsonResponse
    {
        $kegiatan = Kegiatan::find($kegiatanId);
        if (!$kegiatan) {
            return response()->json(['error' => 'Kegiatan tidak ditemukan'], 404);
        }

        $validated = $request->validate([
            'pj_status' => 'nullable|in:H,S,I,A',
            'pj_keterangan' => 'nullable|string',
            'absensi_pendamping' => 'nullable|array',
            'absensi_pendamping.*.guru_id' => 'required|integer',
            'absensi_pendamping.*.status' => 'required|in:H,S,I,A',
            'absensi_pendamping.*.keterangan' => 'nullable|string',
            'absensi_siswa' => 'nullable|array',
            'absensi_siswa.*.siswa_id' => 'required|integer',
            'absensi_siswa.*.status' => 'required|in:H,S,I,A',
            'absensi_siswa.*.keterangan' => 'nullable|string',
            'berita_acara' => 'nullable|string',
            'foto_kegiatan' => 'nullable|array',
        ]);

        $absensi = AbsensiKegiatan::where('kegiatan_id', $kegiatanId)->first();

        if ($absensi) {
            // Update existing
            $oldValues = $absensi->getOriginal();
            $absensi->update([
                'pj_status' => $validated['pj_status'] ?? $absensi->pj_status,
                'pj_keterangan' => array_key_exists('pj_keterangan', $validated) ? $validated['pj_keterangan'] : $absensi->pj_keterangan,
                'absensi_pendamping' => $validated['absensi_pendamping'] ?? $absensi->absensi_pendamping,
                'absensi_siswa' => array_key_exists('absensi_siswa', $validated) ? $validated['absensi_siswa'] : $absensi->absensi_siswa,
                'berita_acara' => $validated['berita_acara'] ?? $absensi->berita_acara,
                'foto_kegiatan' => array_key_exists('foto_kegiatan', $validated) ? $validated['foto_kegiatan'] : $absensi->foto_kegiatan,
                'status' => 'submitted',
            ]);
            ActivityLog::logUpdate($absensi, $oldValues, "Admin mengubah absensi kegiatan: {$kegiatan->nama_kegiatan}");
        } else {
            // Create new absensi record
            $absensi = AbsensiKegiatan::create([
                'kegiatan_id' => $kegiatanId,
                'tanggal' => $kegiatan->waktu_mulai ? Carbon::parse($kegiatan->waktu_mulai)->format('Y-m-d') : now()->format('Y-m-d'),
                'penanggung_jawab_id' => $kegiatan->penanggung_jawab_id,
                'pj_status' => $validated['pj_status'] ?? 'H',
                'pj_keterangan' => $validated['pj_keterangan'] ?? null,
                'absensi_pendamping' => $validated['absensi_pendamping'] ?? [],
                'absensi_siswa' => $validated['absensi_siswa'] ?? [],
                'berita_acara' => $validated['berita_acara'] ?? null,
                'foto_kegiatan' => $validated['foto_kegiatan'] ?? [],
                'status' => 'submitted',
            ]);
            ActivityLog::logCreate($absensi, "Admin membuat absensi kegiatan: {$kegiatan->nama_kegiatan}");
        }

        return response()->json([
            'success' => true,
            'message' => 'Absensi kegiatan berhasil disimpan',
            'data' => $absensi->fresh()
        ]);
    }

    /**
     * Upload photo for rapat documentation.
     */
    public function uploadFotoRapat(Request $request): JsonResponse
    {
        $request->validate([
            'foto' => 'required|image|mimes:jpeg,png,jpg,gif|max:2048',
        ]);

        $path = $request->file('foto')->store('rapat/dokumentasi', 'public');

        return response()->json([
            'success' => true,
            'message' => 'Foto dokumentasi rapat berhasil diupload',
            'data' => [
                'path' => $path,
                'url' => asset('storage/' . $path),
            ],
        ]);
    }

    /**
     * Upload photo for kegiatan documentation.
     */
    public function uploadFotoKegiatan(Request $request): JsonResponse
    {
        $request->validate([
            'foto' => 'required|image|mimes:jpeg,png,jpg,gif|max:2048',
        ]);

        $path = $request->file('foto')->store('kegiatan/dokumentasi', 'public');

        return response()->json([
            'success' => true,
            'message' => 'Foto dokumentasi kegiatan berhasil diupload',
            'data' => [
                'path' => $path,
                'url' => asset('storage/' . $path),
            ],
        ]);
    }
}
