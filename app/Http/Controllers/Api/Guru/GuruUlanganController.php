<?php

namespace App\Http\Controllers\Api\Guru;

use App\Http\Controllers\Controller;
use App\Models\AbsensiMengajar;
use App\Models\NilaiSiswa;
use App\Models\Siswa;
use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class GuruUlanganController extends Controller
{
    /**
     * List all ulangan for the logged-in guru
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $guru = $user->guru;

        if (!$guru) {
            return response()->json(['error' => 'Data guru tidak ditemukan'], 404);
        }

        $query = AbsensiMengajar::with(['nilaiSiswa', 'jadwal.kelas', 'jadwal.mapel'])
            ->where('guru_id', $guru->id)
            ->where('jenis_kegiatan', 'ulangan')
            ->orderBy('tanggal', 'desc');

        // Filter by jenis_ulangan
        if ($request->filled('jenis_ulangan')) {
            $query->where('jenis_ulangan', $request->jenis_ulangan);
        }

        // Filter by mapel (snapshot)
        if ($request->filled('mapel')) {
            $query->where('snapshot_mapel', 'like', '%' . $request->mapel . '%');
        }

        // Filter by kelas (snapshot)
        if ($request->filled('kelas')) {
            $query->where('snapshot_kelas', 'like', '%' . $request->kelas . '%');
        }

        $ulangan = $query->get()->map(function ($item) {
            $nilaiCount = $item->nilaiSiswa->count();
            $nilaiTerisi = $item->nilaiSiswa->whereNotNull('nilai')->count();
            $siswaHadir = $item->siswa_hadir ?? 0;

            return [
                'id' => $item->id,
                'tanggal' => $item->tanggal->translatedFormat('l, d F Y'),
                'tanggal_raw' => $item->tanggal->toDateString(),
                'mapel' => $item->snapshot_mapel ?? $item->jadwal?->mapel?->nama_mapel ?? '-',
                'kelas' => $item->snapshot_kelas ?? $item->jadwal?->kelas?->nama_kelas ?? '-',
                'jam' => $item->snapshot_jam ?? '-',
                'jenis_ulangan' => $item->jenis_ulangan,
                'jenis_ulangan_label' => $this->getLabelUlangan($item->jenis_ulangan),
                'ringkasan_materi' => $item->ringkasan_materi,
                'nilai_terisi' => $nilaiTerisi,
                'siswa_hadir' => $siswaHadir,
                'total_siswa' => $siswaHadir + ($item->siswa_sakit ?? 0) + ($item->siswa_izin ?? 0) + ($item->siswa_alpha ?? 0),
                'status_lengkap' => $nilaiTerisi >= $siswaHadir && $siswaHadir > 0,
                'rata_rata' => $nilaiCount > 0 ? round($item->nilaiSiswa->whereNotNull('nilai')->avg('nilai'), 1) : null,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $ulangan,
        ]);
    }

    /**
     * Detail ulangan + daftar nilai siswa
     */
    public function show(Request $request, $id)
    {
        $user = $request->user();
        $guru = $user->guru;

        $absensi = AbsensiMengajar::with(['nilaiSiswa.siswa', 'jadwal.kelas', 'jadwal.mapel'])
            ->where('id', $id)
            ->where('guru_id', $guru->id)
            ->where('jenis_kegiatan', 'ulangan')
            ->first();

        if (!$absensi) {
            return response()->json(['error' => 'Ulangan tidak ditemukan'], 404);
        }

        // Get all siswa in the class for this jadwal
        $kelasId = $absensi->jadwal?->kelas_id;
        $allSiswa = $kelasId
            ? Siswa::where('kelas_id', $kelasId)->where('status', 'Aktif')->orderBy('nama')->get()
            : collect();

        // Map siswa with their nilai
        $nilaiMap = $absensi->nilaiSiswa->keyBy('siswa_id');
        $siswaList = $allSiswa->map(function ($siswa) use ($nilaiMap) {
            $nilai = $nilaiMap->get($siswa->id);
            return [
                'siswa_id' => $siswa->id,
                'nama' => $siswa->nama,
                'nis' => $siswa->nis,
                'nisn' => $siswa->nisn ?? null,
                'nilai' => $nilai?->nilai,
                'keterangan' => $nilai?->keterangan,
                'sudah_diisi' => $nilai !== null,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $absensi->id,
                'tanggal' => $absensi->tanggal->translatedFormat('l, d F Y'),
                'tanggal_raw' => $absensi->tanggal->toDateString(),
                'mapel' => $absensi->snapshot_mapel ?? $absensi->jadwal?->mapel?->nama_mapel ?? '-',
                'kelas' => $absensi->snapshot_kelas ?? $absensi->jadwal?->kelas?->nama_kelas ?? '-',
                'jam' => $absensi->snapshot_jam ?? '-',
                'jenis_ulangan' => $absensi->jenis_ulangan,
                'jenis_ulangan_label' => $this->getLabelUlangan($absensi->jenis_ulangan),
                'ringkasan_materi' => $absensi->ringkasan_materi,
                'siswa_hadir' => $absensi->siswa_hadir ?? 0,
                'siswa_sakit' => $absensi->siswa_sakit ?? 0,
                'siswa_izin' => $absensi->siswa_izin ?? 0,
                'siswa_alpha' => $absensi->siswa_alpha ?? 0,
                'siswa' => $siswaList,
            ],
        ]);
    }

    /**
     * Update/tambah nilai susulan
     */
    public function updateNilai(Request $request, $id)
    {
        $user = $request->user();
        $guru = $user->guru;

        $absensi = AbsensiMengajar::where('id', $id)
            ->where('guru_id', $guru->id)
            ->where('jenis_kegiatan', 'ulangan')
            ->first();

        if (!$absensi) {
            return response()->json(['error' => 'Ulangan tidak ditemukan'], 404);
        }

        $validated = $request->validate([
            'nilai_siswa' => 'required|array',
            'nilai_siswa.*.siswa_id' => 'required|exists:siswa,id',
            'nilai_siswa.*.nilai' => 'nullable|numeric|min:0|max:100',
            'nilai_siswa.*.keterangan' => 'nullable|string',
        ]);

        $updated = 0;
        foreach ($validated['nilai_siswa'] as $data) {
            if ($data['nilai'] !== null && $data['nilai'] !== '') {
                NilaiSiswa::updateOrCreate(
                    ['absensi_mengajar_id' => $absensi->id, 'siswa_id' => $data['siswa_id']],
                    ['nilai' => $data['nilai'], 'keterangan' => $data['keterangan'] ?? null]
                );
                $updated++;
            }
        }

        // Log activity
        ActivityLog::log(
            'attendance',
            $absensi,
            "Memperbarui nilai ulangan: {$absensi->snapshot_mapel} - {$absensi->snapshot_kelas} ({$updated} siswa)"
        );

        return response()->json([
            'success' => true,
            'message' => "Berhasil menyimpan {$updated} nilai",
        ]);
    }

    /**
     * Export nilai ulangan as CSV (simple, no library needed)
     */
    public function export(Request $request, $id)
    {
        $user = $request->user();
        $guru = $user->guru;

        $absensi = AbsensiMengajar::with(['nilaiSiswa.siswa', 'jadwal.kelas', 'jadwal.mapel'])
            ->where('id', $id)
            ->where('guru_id', $guru->id)
            ->where('jenis_kegiatan', 'ulangan')
            ->first();

        if (!$absensi) {
            return response()->json(['error' => 'Ulangan tidak ditemukan'], 404);
        }

        $kelasId = $absensi->jadwal?->kelas_id;
        $allSiswa = $kelasId
            ? Siswa::where('kelas_id', $kelasId)->where('status', 'Aktif')->orderBy('nama')->get()
            : collect();

        $nilaiMap = $absensi->nilaiSiswa->keyBy('siswa_id');
        $labelUlangan = $this->getLabelUlangan($absensi->jenis_ulangan);
        $mapel = $absensi->snapshot_mapel ?? '-';
        $kelas = $absensi->snapshot_kelas ?? '-';
        $tanggal = $absensi->tanggal->translatedFormat('d F Y');

        // Generate CSV
        $filename = "Nilai_{$labelUlangan}_{$mapel}_{$kelas}_{$tanggal}.csv";
        $filename = str_replace(['/', '\\', ' '], ['_', '_', '_'], $filename);

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ];

        $callback = function () use ($allSiswa, $nilaiMap, $labelUlangan, $mapel, $kelas, $tanggal) {
            $file = fopen('php://output', 'w');
            // BOM for Excel UTF-8
            fprintf($file, chr(0xEF) . chr(0xBB) . chr(0xBF));

            // Header info
            fputcsv($file, ["Rekap Nilai {$labelUlangan}"]);
            fputcsv($file, ["Mata Pelajaran: {$mapel}"]);
            fputcsv($file, ["Kelas: {$kelas}"]);
            fputcsv($file, ["Tanggal: {$tanggal}"]);
            fputcsv($file, []);

            // Table header
            fputcsv($file, ['No', 'NIS', 'Nama Siswa', 'Nilai', 'Keterangan']);

            $no = 1;
            foreach ($allSiswa as $siswa) {
                $nilai = $nilaiMap->get($siswa->id);
                fputcsv($file, [
                    $no++,
                    $siswa->nis,
                    $siswa->nama,
                    $nilai?->nilai ?? '-',
                    $nilai?->keterangan ?? '',
                ]);
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    private function getLabelUlangan(?string $jenis): string
    {
        return match ($jenis) {
            'ulangan_harian' => 'Ulangan Harian',
            'uts' => 'UTS',
            'uas' => 'UAS',
            'quiz' => 'Quiz',
            default => 'Ulangan',
        };
    }
}
