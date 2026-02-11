<?php

namespace App\Http\Controllers\Api\Guru;

use App\Http\Controllers\Controller;
use App\Models\Kegiatan;
use App\Models\AbsensiKegiatan;
use App\Models\Guru;
use App\Models\Kelas;
use App\Models\Siswa;
use App\Models\TahunAjaran;
use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Carbon\Carbon;

class GuruKegiatanController extends Controller
{
    /**
     * Get kegiatan hari ini where guru is PJ or pendamping.
     */
    public function kegiatanHariIni(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $guru = Guru::find($user->guru_id);

            if (!$guru) {
                return response()->json(['error' => 'Guru tidak ditemukan'], 404);
            }

            $today = Carbon::today();
            $tanggal = Carbon::now()->locale('id')->translatedFormat('l, d F Y');

            // Get tahun ajaran from user or active
            $tahunAjaranId = $user->tahun_ajaran_id ?? TahunAjaran::getCurrent()?->id;

            // Get kegiatan where guru is PJ or pendamping AND today is within waktu_mulai and waktu_berakhir
            $kegiatan = Kegiatan::where('status', 'Aktif')
                ->when($tahunAjaranId, fn($q) => $q->where('tahun_ajaran_id', $tahunAjaranId))
                ->whereDate('waktu_mulai', '<=', $today)
                ->whereDate('waktu_berakhir', '>=', $today)
                ->where(function ($query) use ($guru) {
                    $query->where('penanggung_jawab_id', $guru->id)
                        ->orWhereJsonContains('guru_pendamping', $guru->id)
                        ->orWhereJsonContains('guru_pendamping', (string) $guru->id);
                })
                ->with('penanggungjawab:id,nama,nip')
                ->orderBy('waktu_mulai', 'asc')
                ->get()
                ->map(function ($item) use ($guru, $today) {
                    // Ensure guru_pendamping is array
                    $guruPendamping = is_array($item->guru_pendamping) ? $item->guru_pendamping : [];

                    // Determine role
                    $item->is_pj = $item->penanggung_jawab_id === $guru->id;
                    $item->is_pendamping = in_array($guru->id, $guruPendamping) || in_array((string) $guru->id, $guruPendamping);
                    $item->role = $item->is_pj ? 'penanggung_jawab' : 'pendamping';

                    // Check if already absen for this kegiatan (not per day - one attendance for entire multi-day activity)
                    $absensi = AbsensiKegiatan::where('kegiatan_id', $item->id)->first();

                    // Determine status based on role and absensi record
                    if ($absensi) {
                        if ($item->is_pj) {
                            // For PJ: only 'submitted' counts as sudah_absen
                            // 'draft' means pendamping started but PJ hasn't completed
                            if ($absensi->status === 'submitted') {
                                $item->status_absensi = 'sudah_absen';
                            } else {
                                // Draft record exists (from pendamping self-attend)
                                // PJ should still be able to fill absensi
                                $now = Carbon::now();
                                $mulai = Carbon::parse($item->waktu_mulai);
                                $selesai = Carbon::parse($item->waktu_berakhir);

                                if ($now->lt($mulai)) {
                                    $item->status_absensi = 'belum_mulai';
                                } elseif ($now->between($mulai, $selesai)) {
                                    $item->status_absensi = 'sedang_berlangsung';
                                } else {
                                    $item->status_absensi = 'terlewat';
                                }
                            }
                        } else {
                            // For Pendamping: check if they already self-attended
                            $pendampingAbsensi = $absensi->absensi_pendamping ?? [];
                            $selfAttended = false;
                            foreach ($pendampingAbsensi as $entry) {
                                if ($entry['guru_id'] == $guru->id && !empty($entry['self_attended'])) {
                                    $selfAttended = true;
                                    break;
                                }
                            }

                            if ($selfAttended) {
                                $item->status_absensi = 'sudah_absen';
                            } else {
                                $now = Carbon::now();
                                $mulai = Carbon::parse($item->waktu_mulai);
                                $selesai = Carbon::parse($item->waktu_berakhir);

                                if ($now->lt($mulai)) {
                                    $item->status_absensi = 'belum_mulai';
                                } elseif ($now->between($mulai, $selesai)) {
                                    $item->status_absensi = 'sedang_berlangsung';
                                } else {
                                    $item->status_absensi = 'terlewat';
                                }
                            }
                        }
                    } else {
                        // No absensi record exists yet
                        $now = Carbon::now();
                        $mulai = Carbon::parse($item->waktu_mulai);
                        $selesai = Carbon::parse($item->waktu_berakhir);

                        if ($now->lt($mulai)) {
                            $item->status_absensi = 'belum_mulai';
                        } elseif ($now->between($mulai, $selesai)) {
                            $item->status_absensi = 'sedang_berlangsung';
                        } else {
                            $item->status_absensi = 'terlewat';
                        }
                    }

                    // Get guru pendamping names
                    if (!empty($guruPendamping)) {
                        $item->guru_pendamping_list = Guru::whereIn('id', $guruPendamping)
                            ->select('id', 'nama', 'nip')
                            ->get();
                    } else {
                        $item->guru_pendamping_list = [];
                    }

                    // Get kelas peserta names
                    $kelasPeserta = is_array($item->kelas_peserta) ? $item->kelas_peserta : [];
                    if (!empty($kelasPeserta)) {
                        $item->kelas_peserta_list = Kelas::whereIn('id', $kelasPeserta)
                            ->select('id', 'nama_kelas')
                            ->get();
                    } else {
                        $item->kelas_peserta_list = [];
                    }

                    return $item;
                });

            return response()->json([
                'success' => true,
                'tanggal' => $tanggal,
                'kegiatan' => $kegiatan
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Terjadi kesalahan: ' . $e->getMessage(),
                'trace' => config('app.debug') ? $e->getTraceAsString() : null
            ], 500);
        }
    }

    /**
     * Get kegiatan from today onwards (unlimited).
     * Past kegiatan are excluded - they will be recorded as Alpha in riwayat.
     */
    public function kegiatanSeminggu(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $guru = Guru::find($user->guru_id);

            if (!$guru) {
                return response()->json(['error' => 'Guru tidak ditemukan'], 404);
            }

            $today = Carbon::today('Asia/Jakarta');

            // Get tahun ajaran from user or active
            $tahunAjaranId = $user->tahun_ajaran_id ?? TahunAjaran::getCurrent()?->id;

            // Get kegiatan where guru is PJ or pendamping, from today onwards
            $kegiatanList = Kegiatan::where('status', 'Aktif')
                ->when($tahunAjaranId, fn($q) => $q->where('tahun_ajaran_id', $tahunAjaranId))
                ->whereDate('waktu_berakhir', '>=', $today) // Kegiatan that hasn't ended yet
                ->where(function ($query) use ($guru) {
                    $query->where('penanggung_jawab_id', $guru->id)
                        ->orWhereJsonContains('guru_pendamping', $guru->id)
                        ->orWhereJsonContains('guru_pendamping', (string) $guru->id);
                })
                ->with('penanggungjawab:id,nama,nip')
                ->orderBy('waktu_mulai', 'asc')
                ->get();

            // Group kegiatan by date
            $kegiatanByDate = [];

            foreach ($kegiatanList as $item) {
                $guruPendamping = is_array($item->guru_pendamping) ? $item->guru_pendamping : [];
                $isPj = $item->penanggung_jawab_id === $guru->id;
                $isPendamping = in_array($guru->id, $guruPendamping) || in_array((string) $guru->id, $guruPendamping);
                $role = $isPj ? 'penanggung_jawab' : 'pendamping';

                // Check absensi status
                $absensi = AbsensiKegiatan::where('kegiatan_id', $item->id)->first();

                // Calculate the dates this kegiatan spans (from max(start, today) to end)
                $startDate = Carbon::parse($item->waktu_mulai)->startOfDay();
                $endActivityDate = Carbon::parse($item->waktu_berakhir)->startOfDay();

                // Start from today if kegiatan started before today
                $effectiveStart = $startDate->lt($today) ? $today->copy() : $startDate->copy();

                // Add to each applicable date
                $currentDate = $effectiveStart->copy();
                while ($currentDate->lte($endActivityDate)) {
                    $dateStr = $currentDate->format('Y-m-d');

                    // Calculate status for THIS specific date
                    $statusAbsensi = $this->getKegiatanAbsensiStatusForDate($item, $guru, $absensi, $isPj, $dateStr);

                    // Get guru pendamping names
                    $guruPendamping = is_array($item->guru_pendamping) ? $item->guru_pendamping : [];
                    $guruPendampingList = [];
                    if (!empty($guruPendamping)) {
                        $guruPendampingList = Guru::whereIn('id', $guruPendamping)
                            ->select('id', 'nama', 'nip')
                            ->get();
                    }

                    // Get kelas peserta names
                    $kelasPeserta = is_array($item->kelas_peserta) ? $item->kelas_peserta : [];
                    $kelasPesertaList = [];
                    if (!empty($kelasPeserta)) {
                        $kelasPesertaList = Kelas::whereIn('id', $kelasPeserta)
                            ->select('id', 'nama_kelas')
                            ->get();
                    }

                    $kegiatanData = [
                        'id' => $item->id,
                        'nama_kegiatan' => $item->nama_kegiatan,
                        'tempat' => $item->tempat,
                        'waktu_mulai' => $item->waktu_mulai,
                        'waktu_berakhir' => $item->waktu_berakhir,
                        'penanggungjawab' => $item->penanggungjawab,
                        'is_pj' => $isPj,
                        'is_pendamping' => $isPendamping,
                        'role' => $role,
                        'status_absensi' => $statusAbsensi,
                        'guru_pendamping_list' => $guruPendampingList,
                        'kelas_peserta_list' => $kelasPesertaList,
                    ];

                    if (!isset($kegiatanByDate[$dateStr])) {
                        $kegiatanByDate[$dateStr] = [];
                    }
                    $kegiatanByDate[$dateStr][] = $kegiatanData;

                    $currentDate->addDay();
                }
            }

            // Sort dates
            ksort($kegiatanByDate);

            return response()->json([
                'success' => true,
                'kegiatan' => $kegiatanByDate
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Terjadi kesalahan: ' . $e->getMessage(),
                'trace' => config('app.debug') ? $e->getTraceAsString() : null
            ], 500);
        }
    }

    /**
     * Helper to determine kegiatan absensi status
     */
    private function getKegiatanAbsensiStatus($kegiatan, $guru, $absensi, $isPj)
    {
        $now = Carbon::now('Asia/Jakarta');
        $mulai = Carbon::parse($kegiatan->waktu_mulai);
        $selesai = Carbon::parse($kegiatan->waktu_berakhir);

        if ($absensi) {
            if ($isPj) {
                if ($absensi->status === 'submitted') {
                    return 'sudah_absen';
                }
            } else {
                $pendampingAbsensi = $absensi->absensi_pendamping ?? [];
                foreach ($pendampingAbsensi as $entry) {
                    if ($entry['guru_id'] == $guru->id && !empty($entry['self_attended'])) {
                        return 'sudah_absen';
                    }
                }
            }
        }

        if ($now->lt($mulai)) {
            return 'belum_mulai';
        } elseif ($now->between($mulai, $selesai)) {
            return 'sedang_berlangsung';
        } else {
            return 'terlewat';
        }
    }

    /**
     * Helper to determine kegiatan absensi status for a specific date
     * Used for weekly view where status varies by date
     */
    private function getKegiatanAbsensiStatusForDate($kegiatan, $guru, $absensi, $isPj, $targetDate)
    {
        $today = Carbon::today('Asia/Jakarta')->format('Y-m-d');
        $now = Carbon::now('Asia/Jakarta');

        // Check if already attended
        if ($absensi) {
            if ($isPj) {
                if ($absensi->status === 'submitted') {
                    return 'sudah_absen';
                }
            } else {
                $pendampingAbsensi = $absensi->absensi_pendamping ?? [];
                foreach ($pendampingAbsensi as $entry) {
                    if ($entry['guru_id'] == $guru->id && !empty($entry['self_attended'])) {
                        return 'sudah_absen';
                    }
                }
            }
        }

        // If target date is in the future → belum_mulai
        if ($targetDate > $today) {
            return 'belum_mulai';
        }

        // NOTE: 'terlewat' for past dates disabled for now
        // Will be useful for Riwayat page later
        // if ($targetDate < $today) {
        //     return 'terlewat';
        // }

        // Target date is today - check time
        $mulai = Carbon::parse($kegiatan->waktu_mulai);
        $selesai = Carbon::parse($kegiatan->waktu_berakhir);

        if ($now->lt($mulai)) {
            return 'belum_mulai';
        } elseif ($now->between($mulai, $selesai)) {
            return 'sedang_berlangsung';
        } else {
            return 'terlewat';
        }
    }


    /**
     * Get detail kegiatan with siswa peserta.
     */
    public function detailKegiatan(Request $request, $id): JsonResponse
    {
        $user = $request->user();
        $guru = Guru::find($user->guru_id);

        if (!$guru) {
            return response()->json(['error' => 'Guru tidak ditemukan'], 404);
        }

        $kegiatan = Kegiatan::with('penanggungjawab:id,nama,nip')->find($id);

        if (!$kegiatan) {
            return response()->json(['error' => 'Kegiatan tidak ditemukan'], 404);
        }

        // Check if guru is authorized (PJ or pendamping)
        $isPj = $kegiatan->penanggung_jawab_id === $guru->id;
        $isPendamping = in_array($guru->id, $kegiatan->guru_pendamping ?? []);

        if (!$isPj && !$isPendamping) {
            return response()->json(['error' => 'Anda tidak memiliki akses ke kegiatan ini'], 403);
        }

        // Get guru pendamping list
        $guruPendampingList = [];
        if (!empty($kegiatan->guru_pendamping)) {
            $guruPendampingList = Guru::whereIn('id', $kegiatan->guru_pendamping)
                ->select('id', 'nama', 'nip')
                ->get();
        }

        // Get siswa from kelas peserta
        $siswaList = [];
        if (!empty($kegiatan->kelas_peserta)) {
            $siswaList = Siswa::whereIn('kelas_id', $kegiatan->kelas_peserta)
                ->where('status', 'Aktif')
                ->select('id', 'nama', 'nis', 'kelas_id')
                ->with('kelas:id,nama_kelas')
                ->orderBy('nama')
                ->get()
                ->map(function ($siswa) {
                    return [
                        'id' => $siswa->id,
                        'nama' => $siswa->nama,
                        'nis' => $siswa->nis,
                        'kelas' => $siswa->kelas->nama_kelas ?? '-'
                    ];
                });
        }

        // Get kelas peserta names
        $kelasList = [];
        if (!empty($kegiatan->kelas_peserta)) {
            $kelasList = Kelas::whereIn('id', $kegiatan->kelas_peserta)
                ->select('id', 'nama_kelas')
                ->get();
        }

        return response()->json([
            'success' => true,
            'kegiatan' => $kegiatan,
            'is_pj' => $isPj,
            'is_pendamping' => $isPendamping,
            'guru_pendamping' => $guruPendampingList,
            'kelas_peserta' => $kelasList,
            'siswa' => $siswaList
        ]);
    }

    /**
     * Simpan absensi kegiatan (untuk PJ).
     */
    public function simpanAbsensi(Request $request): JsonResponse
    {
        $user = $request->user();
        $guru = Guru::find($user->guru_id);

        if (!$guru) {
            return response()->json(['error' => 'Guru tidak ditemukan'], 404);
        }

        $validated = $request->validate([
            'kegiatan_id' => 'required|exists:kegiatan,id',
            'pj_status' => 'required|in:H,I,A',
            'pj_keterangan' => 'nullable|string',
            'absensi_pendamping' => 'nullable|array',
            'absensi_pendamping.*.guru_id' => 'required|exists:guru,id',
            'absensi_pendamping.*.status' => 'required|in:H,I,A',
            'absensi_pendamping.*.keterangan' => 'nullable|string',
            'absensi_siswa' => 'nullable|array',
            'absensi_siswa.*.siswa_id' => 'required|exists:siswa,id',
            'absensi_siswa.*.status' => 'required|in:H,I,A',
            'absensi_siswa.*.keterangan' => 'nullable|string',
            'berita_acara' => 'nullable|string',
            'foto_kegiatan' => 'required|array|min:2|max:4',
            'foto_kegiatan.*' => 'required|string', // Base64 images
            'is_unlocked' => 'nullable|boolean', // Flag for unlocked attendance update
        ]);

        $kegiatan = Kegiatan::find($validated['kegiatan_id']);

        // Verify guru is the PJ
        if ($kegiatan->penanggung_jawab_id !== $guru->id) {
            return response()->json(['error' => 'Hanya penanggung jawab yang bisa menyimpan absensi'], 403);
        }

        $today = Carbon::today();

        // Check if already submitted for this activity (not per day - one attendance for entire multi-day activity)
        $existing = AbsensiKegiatan::where('kegiatan_id', $kegiatan->id)->first();

        // Check if attendance is unlocked (either from request or admin setting)
        $isUnlocked = $request->input('is_unlocked', false) || \App\Models\AppSetting::isAttendanceUnlocked();

        if ($existing && $existing->status === 'submitted' && !$isUnlocked) {
            return response()->json(['error' => 'Absensi kegiatan ini sudah dilakukan'], 422);
        }

        // Merge pendamping absensi - preserve self-attended data
        $mergedPendamping = [];
        $existingPendamping = $existing ? ($existing->absensi_pendamping ?? []) : [];
        $newPendamping = $validated['absensi_pendamping'] ?? [];

        foreach ($newPendamping as $newEntry) {
            $found = false;
            foreach ($existingPendamping as $existingEntry) {
                if ($existingEntry['guru_id'] == $newEntry['guru_id']) {
                    // If existing was self-attended and PJ is not changing status, keep self_attended flag
                    $mergedEntry = $newEntry;
                    if (!empty($existingEntry['self_attended'])) {
                        $mergedEntry['self_attended'] = true;
                        $mergedEntry['attended_at'] = $existingEntry['attended_at'] ?? null;
                    }
                    $mergedPendamping[] = $mergedEntry;
                    $found = true;
                    break;
                }
            }
            if (!$found) {
                $mergedPendamping[] = $newEntry;
            }
        }

        // Compress foto_kegiatan images before saving
        $compressedFotos = \App\Services\ImageService::compressBase64Multiple($validated['foto_kegiatan']);

        if ($existing) {
            // Update existing draft record to submitted
            $existing->update([
                'pj_status' => $validated['pj_status'],
                'pj_keterangan' => $validated['pj_keterangan'] ?? null,
                'absensi_pendamping' => $mergedPendamping,
                'absensi_siswa' => $validated['absensi_siswa'] ?? [],
                'berita_acara' => $validated['berita_acara'] ?? null,
                'foto_kegiatan' => $compressedFotos,
                'status' => 'submitted',
            ]);
            $absensi = $existing;
        } else {
            // Create new absensi record
            $absensi = AbsensiKegiatan::create([
                'kegiatan_id' => $kegiatan->id,
                'tanggal' => $today,
                'penanggung_jawab_id' => $guru->id,
                'pj_status' => $validated['pj_status'],
                'pj_keterangan' => $validated['pj_keterangan'] ?? null,
                'absensi_pendamping' => $mergedPendamping,
                'absensi_siswa' => $validated['absensi_siswa'] ?? [],
                'berita_acara' => $validated['berita_acara'] ?? null,
                'foto_kegiatan' => $compressedFotos,
                'status' => 'submitted',
            ]);
        }

        // Log activity
        ActivityLog::log(
            'attendance',
            $absensi,
            "Menyimpan absensi kegiatan: {$kegiatan->nama_kegiatan}"
        );

        return response()->json([
            'success' => true,
            'message' => 'Absensi kegiatan berhasil disimpan',
            'data' => $absensi
        ]);
    }

    /**
     * Simpan absensi kegiatan untuk guru pendamping (self-attendance).
     */
    public function absensiPendamping(Request $request): JsonResponse
    {
        $user = $request->user();
        $guru = Guru::find($user->guru_id);

        if (!$guru) {
            return response()->json(['error' => 'Guru tidak ditemukan'], 404);
        }

        $validated = $request->validate([
            'kegiatan_id' => 'required|exists:kegiatan,id',
            'status' => 'required|in:H,I,A',
            'keterangan' => 'nullable|string',
        ]);

        $kegiatan = Kegiatan::find($validated['kegiatan_id']);

        // Verify guru is a pendamping
        $guruPendamping = is_array($kegiatan->guru_pendamping) ? $kegiatan->guru_pendamping : [];
        $isPendamping = in_array($guru->id, $guruPendamping) || in_array((string) $guru->id, $guruPendamping);

        if (!$isPendamping) {
            return response()->json(['error' => 'Anda bukan pendamping kegiatan ini'], 403);
        }

        $today = Carbon::today();

        // Find or create absensi record for this activity (not per day - one attendance for entire multi-day activity)
        $absensi = AbsensiKegiatan::where('kegiatan_id', $kegiatan->id)->first();

        if ($absensi) {
            // Update existing record - add or update this pendamping's attendance
            $currentAbsensi = $absensi->absensi_pendamping ?? [];

            // Find and update or add new entry
            $found = false;
            foreach ($currentAbsensi as &$entry) {
                if ($entry['guru_id'] == $guru->id) {
                    $entry['status'] = $validated['status'];
                    $entry['keterangan'] = $validated['keterangan'] ?? null;
                    $entry['self_attended'] = true;
                    $entry['attended_at'] = now()->toISOString();
                    $found = true;
                    break;
                }
            }

            if (!$found) {
                $currentAbsensi[] = [
                    'guru_id' => $guru->id,
                    'status' => $validated['status'],
                    'keterangan' => $validated['keterangan'] ?? null,
                    'self_attended' => true,
                    'attended_at' => now()->toISOString(),
                ];
            }

            $absensi->update(['absensi_pendamping' => $currentAbsensi]);
        } else {
            // Create new record with just this pendamping's attendance
            $absensi = AbsensiKegiatan::create([
                'kegiatan_id' => $kegiatan->id,
                'tanggal' => $today,
                'penanggung_jawab_id' => $kegiatan->penanggung_jawab_id,
                'pj_status' => 'A', // Default PJ to Alpha, will be updated by PJ later
                'absensi_pendamping' => [
                    [
                        'guru_id' => $guru->id,
                        'status' => $validated['status'],
                        'keterangan' => $validated['keterangan'] ?? null,
                        'self_attended' => true,
                        'attended_at' => now()->toISOString(),
                    ]
                ],
                'absensi_siswa' => [],
                'foto_kegiatan' => [],
                'status' => 'draft',
            ]);
        }

        // Log activity
        ActivityLog::log(
            'attendance',
            $absensi,
            "Absensi pendamping kegiatan: {$kegiatan->nama_kegiatan} (Status: {$validated['status']})"
        );

        return response()->json([
            'success' => true,
            'message' => 'Absensi Anda berhasil disimpan',
            'data' => [
                'status' => $validated['status'],
                'keterangan' => $validated['keterangan'] ?? null,
            ]
        ]);
    }

    /**
     * Get current absensi pendamping status for a kegiatan (for realtime sync).
     */
    public function getAbsensiPendamping(Request $request, $id): JsonResponse
    {
        // Get absensi record for this activity (not per day)
        $absensi = AbsensiKegiatan::where('kegiatan_id', $id)->first();

        if (!$absensi) {
            return response()->json([
                'success' => true,
                'data' => []
            ]);
        }

        return response()->json([
            'success' => true,
            'data' => $absensi->absensi_pendamping ?? []
        ]);
    }

    /**
     * Check pendamping status for a kegiatan (from PJ submission or self-attendance).
     */
    public function checkPendampingStatus(Request $request, $id): JsonResponse
    {
        $user = $request->user();
        $guru = Guru::find($user->guru_id);

        if (!$guru) {
            return response()->json(['error' => 'Guru tidak ditemukan'], 404);
        }

        // Get absensi record for this activity (not per day)
        $absensi = AbsensiKegiatan::where('kegiatan_id', $id)->first();

        if (!$absensi) {
            return response()->json([
                'success' => true,
                'attended' => false,
                'submitted' => false,
                'self_attended' => false,
                'status' => null
            ]);
        }

        $pendampingAbsensi = $absensi->absensi_pendamping ?? [];

        // Find this guru's entry in pendamping absensi
        foreach ($pendampingAbsensi as $entry) {
            if ($entry['guru_id'] == $guru->id) {
                return response()->json([
                    'success' => true,
                    'attended' => true,
                    'submitted' => $absensi->status === 'submitted',
                    'self_attended' => !empty($entry['self_attended']),
                    'status' => $entry['status'],
                    'keterangan' => $entry['keterangan'] ?? null,
                ]);
            }
        }

        // Guru not found in pendamping list - return submitted status for read-only check
        return response()->json([
            'success' => true,
            'attended' => false,
            'submitted' => $absensi->status === 'submitted',
            'self_attended' => false,
            'status' => null
        ]);
    }

    /**
     * Get existing absensi data for a kegiatan (for loading into modal).
     */
    public function getAbsensiKegiatan(Request $request, $id): JsonResponse
    {
        $user = $request->user();
        $guru = Guru::find($user->guru_id);

        if (!$guru) {
            return response()->json(['error' => 'Guru tidak ditemukan'], 404);
        }

        $kegiatan = Kegiatan::find($id);

        if (!$kegiatan) {
            return response()->json(['error' => 'Kegiatan tidak ditemukan'], 404);
        }

        // Check if guru is authorized (PJ or pendamping)
        $isPj = $kegiatan->penanggung_jawab_id === $guru->id;
        $isPendamping = in_array($guru->id, $kegiatan->guru_pendamping ?? []);

        if (!$isPj && !$isPendamping) {
            return response()->json(['error' => 'Anda tidak memiliki akses ke kegiatan ini'], 403);
        }

        // Get existing absensi
        $absensi = AbsensiKegiatan::where('kegiatan_id', $id)->first();

        if (!$absensi) {
            return response()->json([
                'success' => true,
                'has_absensi' => false,
                'data' => null
            ]);
        }

        return response()->json([
            'success' => true,
            'has_absensi' => true,
            'data' => [
                'pj_status' => $absensi->pj_status,
                'pj_keterangan' => $absensi->pj_keterangan,
                'absensi_pendamping' => $absensi->absensi_pendamping ?? [],
                'absensi_siswa' => $absensi->absensi_siswa ?? [],
                'berita_acara' => $absensi->berita_acara,
                'foto_kegiatan' => $absensi->foto_kegiatan ?? [],
                'status' => $absensi->status,
            ]
        ]);
    }
}
