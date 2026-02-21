<?php

namespace App\Http\Controllers\Api\Guru;

use App\Http\Controllers\Controller;
use App\Models\Jadwal;
use App\Models\AbsensiMengajar;
use App\Models\AbsensiSiswa;
use App\Models\Siswa;
use App\Models\TahunAjaran;
use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class GuruAbsensiController extends Controller
{
    /**
     * Get jadwal hari ini untuk guru yang login dengan status absensi
     */
    public function jadwalHariIni(Request $request)
    {
        $user = $request->user();
        $guru = $user->guru;

        if (!$guru) {
            return response()->json(['jadwal' => [], 'debug' => 'Guru not found'], 200);
        }

        // Use explicit Jakarta timezone
        $today = Carbon::today('Asia/Jakarta');
        $now = Carbon::now('Asia/Jakarta');
        $dayName = $today->locale('id')->translatedFormat('l'); // Senin, Selasa, etc.

        // Get jadwal for today filtered by user's active tahun_ajaran
        $tahunAjaranId = $user->tahun_ajaran_id ?? TahunAjaran::getCurrent()?->id;

        $jadwalList = Jadwal::with(['mapel', 'kelas'])
            ->where('guru_id', $guru->id)
            ->where('hari', $dayName)
            ->where('status', 'Aktif')
            ->when($tahunAjaranId, fn($q) => $q->where('tahun_ajaran_id', $tahunAjaranId))
            ->orderBy('jam_mulai')
            ->get();

        $result = [];

        foreach ($jadwalList as $jadwal) {
            // Check if already attended today
            $absensi = AbsensiMengajar::where('jadwal_id', $jadwal->id)
                ->where('tanggal', $today->toDateString())
                ->first();

            // Determine status based on time
            $jamMulai = Carbon::parse($today->toDateString() . ' ' . $jadwal->jam_mulai);
            $jamSelesai = Carbon::parse($today->toDateString() . ' ' . $jadwal->jam_selesai);

            $status = 'belum_mulai'; // default: biru

            $kehadiranStatus = null;

            if ($absensi) {
                $status = 'sudah_absen'; // hijau
                $kehadiranStatus = $absensi->guru_status ?? 'H';
            } elseif ($now->greaterThan($jamSelesai)) {
                $status = 'terlewat'; // merah (alpha)
            } elseif ($now->greaterThanOrEqualTo($jamMulai) && $now->lessThanOrEqualTo($jamSelesai)) {
                $status = 'sedang_berlangsung'; // merah (belum absen)
            }

            $result[] = [
                'id' => $jadwal->id,
                'mapel' => $jadwal->mapel->nama_mapel ?? 'Unknown',
                'kelas' => $jadwal->kelas->nama_kelas ?? 'Unknown',
                'jam_mulai' => $jadwal->jam_mulai,
                'jam_selesai' => $jadwal->jam_selesai,
                'jam_ke' => $jadwal->jam_ke,
                'status' => $status,
                'kehadiran_status' => $kehadiranStatus,
                'absensi_id' => $absensi?->id,
            ];
        }

        return response()->json([
            'jadwal' => $result,
            'tanggal' => $today->locale('id')->translatedFormat('l, d F Y'),
            'hari' => $dayName, // Debug: show detected day
            'waktu' => $now->format('H:i:s'), // Debug: show current time
        ]);
    }

    /**
     * Get jadwal seminggu untuk halaman AbsensiMengajar
     */
    public function jadwalSeminggu(Request $request)
    {
        $user = $request->user();
        $guru = $user->guru;

        if (!$guru) {
            return response()->json(['jadwal' => []], 200);
        }

        // Use explicit Jakarta timezone
        $today = Carbon::today('Asia/Jakarta');
        $now = Carbon::now('Asia/Jakarta');
        $todayName = $today->locale('id')->translatedFormat('l');
        $days = ['Sabtu', 'Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis'];

        $result = [];

        // Get tahun ajaran filter
        $tahunAjaranId = $user->tahun_ajaran_id ?? TahunAjaran::getCurrent()?->id;

        foreach ($days as $day) {
            $jadwalList = Jadwal::with(['mapel', 'kelas'])
                ->where('guru_id', $guru->id)
                ->where('hari', $day)
                ->where('status', 'Aktif')
                ->when($tahunAjaranId, fn($q) => $q->where('tahun_ajaran_id', $tahunAjaranId))
                ->orderBy('jam_mulai')
                ->get();

            $dayResult = [];

            foreach ($jadwalList as $jadwal) {
                // Only check absensi status for today
                $status = 'belum_mulai';
                $kehadiranStatus = null;

                if ($day === $todayName) {
                    $absensi = AbsensiMengajar::where('jadwal_id', $jadwal->id)
                        ->where('tanggal', $today->toDateString())
                        ->first();

                    $jamMulai = Carbon::parse($today->toDateString() . ' ' . $jadwal->jam_mulai);
                    $jamSelesai = Carbon::parse($today->toDateString() . ' ' . $jadwal->jam_selesai);

                    if ($absensi) {
                        $status = 'sudah_absen';
                        $kehadiranStatus = $absensi->guru_status ?? 'H';
                    } elseif ($now->greaterThan($jamSelesai)) {
                        $status = 'terlewat';
                    } elseif ($now->greaterThanOrEqualTo($jamMulai) && $now->lessThanOrEqualTo($jamSelesai)) {
                        $status = 'sedang_berlangsung';
                    }
                }

                $dayResult[] = [
                    'id' => $jadwal->id,
                    'mapel' => $jadwal->mapel->nama_mapel ?? 'Unknown',
                    'kelas' => $jadwal->kelas->nama_kelas ?? 'Unknown',
                    'jam_mulai' => $jadwal->jam_mulai,
                    'jam_selesai' => $jadwal->jam_selesai,
                    'jam_ke' => $jadwal->jam_ke,
                    'status' => $status,
                    'kehadiran_status' => $kehadiranStatus,
                ];
            }

            $result[$day] = $dayResult;
        }

        return response()->json([
            'jadwal' => $result,
            'tanggal' => $today->locale('id')->translatedFormat('l, d F Y'),
            'tanggal_raw' => $today->toDateString(), // Y-m-d format for form submissions
            'hari_ini' => $todayName,
            'waktu' => $now->format('H:i:s'), // Debug
        ]);
    }

    /**
     * Get detail jadwal + list siswa untuk form absensi
     */
    public function detailJadwal(Request $request, $id)
    {
        $user = $request->user();
        $guru = $user->guru;

        $jadwal = Jadwal::with(['mapel', 'kelas.siswa'])
            ->where('id', $id)
            ->where('guru_id', $guru->id)
            ->first();

        if (!$jadwal) {
            return response()->json(['error' => 'Jadwal tidak ditemukan'], 404);
        }

        // Use explicit Jakarta timezone
        $today = Carbon::today('Asia/Jakarta');

        // Get existing absensi mengajar if any
        $absensi = AbsensiMengajar::where('jadwal_id', $jadwal->id)
            ->where('tanggal', $today->toDateString())
            ->first();

        // Get daily absensi siswa for this kelas + tanggal
        $dailyAbsensi = AbsensiSiswa::where('kelas_id', $jadwal->kelas_id)
            ->where('tanggal', $today->toDateString())
            ->get()
            ->keyBy('siswa_id');

        // Get siswa list, merge with daily absensi status
        $siswaList = $jadwal->kelas->siswa()
            ->where('status', 'Aktif')
            ->orderBy('nama')
            ->get()
            ->map(function ($siswa) use ($dailyAbsensi) {
                $absensiRecord = $dailyAbsensi->get($siswa->id);
                return [
                    'id' => $siswa->id,
                    'nama' => $siswa->nama,
                    'nis' => $siswa->nis,
                    'status' => $absensiRecord?->status ?? 'H',
                    'keterangan' => $absensiRecord?->keterangan ?? '',
                ];
            });

        return response()->json([
            'jadwal' => [
                'id' => $jadwal->id,
                'mapel' => $jadwal->mapel->nama_mapel ?? 'Unknown',
                'kelas' => $jadwal->kelas->nama_kelas ?? 'Unknown',
                'jam_mulai' => $jadwal->jam_mulai,
                'jam_selesai' => $jadwal->jam_selesai,
            ],
            'absensi' => $absensi ? [
                'id' => $absensi->id,
                'ringkasan_materi' => $absensi->ringkasan_materi,
                'berita_acara' => $absensi->berita_acara,
                'status' => $absensi->status,
            ] : null,
            'siswa' => $siswaList,
            'tanggal' => $today->locale('id')->translatedFormat('l, d F Y'),
        ]);
    }

    /**
     * Simpan absensi guru dan absensi siswa
     */
    public function simpanAbsensi(Request $request)
    {
        try {
            $user = $request->user();
            $guru = $user->guru;

            $validated = $request->validate([
                'jadwal_id' => 'required|exists:jadwal,id',
                'tanggal' => 'nullable|string', // For unlocked mode - specific date (accepts various formats)
                'ringkasan_materi' => 'nullable|string',
                'berita_acara' => 'nullable|string',
                'guru_status' => 'nullable|in:H,S,I,A',
                'guru_keterangan' => 'nullable|string',
                'guru_tugas_id' => 'nullable|exists:guru,id', // Replacement teacher when absent
                'tugas_siswa' => 'nullable|string', // Task for students when teacher absent
                'is_unlocked' => 'nullable|boolean',
                'absensi_siswa' => 'nullable|array',
                'absensi_siswa.*.siswa_id' => 'required|exists:siswa,id',
                'absensi_siswa.*.status' => 'required|in:H,S,I,A',
                'absensi_siswa.*.keterangan' => 'nullable|string',
            ]);

            // Use explicit Jakarta timezone
            $today = Carbon::today('Asia/Jakarta');
            $now = Carbon::now('Asia/Jakarta');

            // Parse tanggal with multiple format support
            $targetDate = $today;
            if (!empty($validated['tanggal'])) {
                try {
                    $targetDate = Carbon::parse($validated['tanggal'])->startOfDay();
                } catch (\Exception $e) {
                    return response()->json(['error' => 'Format tanggal tidak valid: ' . $validated['tanggal']], 422);
                }
            }
            $isUnlocked = $validated['is_unlocked'] ?? false;

            // Verify jadwal belongs to this guru
            $jadwal = Jadwal::with(['kelas', 'mapel'])->where('id', $validated['jadwal_id'])
                ->where('guru_id', $guru->id)
                ->first();

            if (!$jadwal) {
                return response()->json(['error' => 'Jadwal tidak valid'], 403);
            }

            // Check if already exists - first by jadwal_id, then by snapshot fields (for historical data)
            $absensi = AbsensiMengajar::where('jadwal_id', $jadwal->id)
                ->where('tanggal', $targetDate->toDateString())
                ->first();

            // If not found by jadwal_id, check by new unique constraint (for data that was imported with null jadwal_id)
            if (!$absensi) {
                $absensi = AbsensiMengajar::where('guru_id', $guru->id)
                    ->where('tanggal', $targetDate->toDateString())
                    ->where('snapshot_kelas', $jadwal->kelas?->nama_kelas)
                    ->where('snapshot_mapel', $jadwal->mapel?->nama_mapel)
                    ->first();
            }

            $guruStatus = $validated['guru_status'] ?? 'H';

            if ($absensi) {
                // If unlocked mode, update existing record
                if ($isUnlocked) {
                    // Capture old values for logging
                    $oldAbsensiValues = $absensi->toArray();

                    // Update record - also update jadwal_id if it was null (historical import data)
                    $absensi->update([
                        'jadwal_id' => $jadwal->id, // Link to jadwal if not already linked
                        'ringkasan_materi' => $validated['ringkasan_materi'] ?? null,
                        'berita_acara' => $validated['berita_acara'] ?? null,
                        'status' => 'hadir',
                        'guru_status' => $guruStatus,
                        'guru_keterangan' => in_array($guruStatus, ['I', 'S', 'A']) ? ($validated['guru_keterangan'] ?? null) : null,
                        'guru_tugas_id' => in_array($guruStatus, ['I', 'S']) ? ($validated['guru_tugas_id'] ?? null) : null,
                        'tugas_siswa' => in_array($guruStatus, ['I', 'S']) ? ($validated['tugas_siswa'] ?? null) : null,
                        'absensi_time' => $now,
                    ]);

                    // Update daily absensi siswa (per-day, not per-mapel)
                    if (!empty($validated['absensi_siswa'])) {
                        $snapshotCounts = $this->saveDailyAbsensiSiswa(
                            $validated['absensi_siswa'],
                            $jadwal->kelas_id,
                            $targetDate->toDateString()
                        );
                        // Snapshot siswa counts into absensi_mengajar
                        $absensi->update($snapshotCounts);
                    }

                    // Log activity for attendance update
                    ActivityLog::log(
                        'attendance',
                        $absensi,
                        "Mengubah absensi mengajar: {$absensi->snapshot_mapel} - {$absensi->snapshot_kelas} ({$absensi->tanggal})",
                        $oldAbsensiValues,
                        $absensi->toArray()
                    );

                    return response()->json([
                        'success' => true,
                        'message' => 'Absensi berhasil diperbarui',
                        'data' => $absensi,
                    ], 200);
                } else {
                    return response()->json(['error' => 'Absensi sudah dilakukan untuk jadwal ini hari ini'], 400);
                }
            }

            // Create new absensi mengajar with guru_status and snapshot
            $absensi = AbsensiMengajar::create([
                'jadwal_id' => $jadwal->id,
                'guru_id' => $guru->id,
                // Snapshot data - captures schedule info at this moment
                'snapshot_kelas' => $jadwal->kelas?->nama_kelas ?? null,
                'snapshot_mapel' => $jadwal->mapel?->nama_mapel ?? null,
                'snapshot_jam' => $jadwal->jam_mulai . ' - ' . $jadwal->jam_selesai,
                'snapshot_hari' => $jadwal->hari,
                'snapshot_guru_nama' => $guru->nama,
                'tanggal' => $targetDate->toDateString(),
                'ringkasan_materi' => $validated['ringkasan_materi'] ?? null,
                'berita_acara' => $validated['berita_acara'] ?? null,
                'status' => 'hadir',
                'guru_status' => $guruStatus,
                'guru_keterangan' => in_array($guruStatus, ['I', 'S', 'A']) ? ($validated['guru_keterangan'] ?? null) : null,
                'guru_tugas_id' => in_array($guruStatus, ['I', 'S']) ? ($validated['guru_tugas_id'] ?? null) : null,
                'tugas_siswa' => in_array($guruStatus, ['I', 'S']) ? ($validated['tugas_siswa'] ?? null) : null,
                'absensi_time' => $now,
            ]);

            // Save daily absensi siswa (per-day, not per-mapel)
            if (!empty($validated['absensi_siswa'])) {
                $snapshotCounts = $this->saveDailyAbsensiSiswa(
                    $validated['absensi_siswa'],
                    $jadwal->kelas_id,
                    $targetDate->toDateString()
                );
                // Snapshot siswa counts into absensi_mengajar
                $absensi->update($snapshotCounts);
            }

            // Log activity for new attendance
            ActivityLog::log(
                'attendance',
                $absensi,
                "Menyimpan absensi mengajar: {$absensi->snapshot_mapel} - {$absensi->snapshot_kelas} ({$absensi->tanggal})"
            );

            return response()->json([
                'success' => true,
                'message' => 'Absensi berhasil disimpan',
                'data' => $absensi,
            ], 201);
        } catch (\Exception $e) {
            \Log::error('simpanAbsensi error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'request' => $request->all()
            ]);
            return response()->json([
                'error' => 'Terjadi kesalahan: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Save daily absensi siswa (per-day system).
     * Only stores S/I/A in database. H records are deleted.
     * Returns snapshot counts for absensi_mengajar.
     */
    private function saveDailyAbsensiSiswa(array $absensiSiswaData, int $kelasId, string $tanggal): array
    {
        $counts = ['siswa_hadir' => 0, 'siswa_sakit' => 0, 'siswa_izin' => 0, 'siswa_alpha' => 0];

        foreach ($absensiSiswaData as $siswaData) {
            $status = $siswaData['status'];
            $siswaId = $siswaData['siswa_id'];

            if ($status === 'H') {
                // Hadir = delete record if exists (H is the default, not stored)
                AbsensiSiswa::where('siswa_id', $siswaId)
                    ->where('tanggal', $tanggal)
                    ->delete();
                $counts['siswa_hadir']++;
            } else {
                // S/I/A = upsert (create or update)
                AbsensiSiswa::updateOrCreate(
                    ['siswa_id' => $siswaId, 'tanggal' => $tanggal],
                    [
                        'kelas_id' => $kelasId,
                        'status' => $status,
                        'keterangan' => $siswaData['keterangan'] ?? null,
                    ]
                );
                match ($status) {
                    'S' => $counts['siswa_sakit']++,
                    'I' => $counts['siswa_izin']++,
                    'A' => $counts['siswa_alpha']++,
                    default => null,
                };
            }
        }

        return $counts;
    }

    /**
     * Get siswa list by jadwal ID - for unlocked attendance form
     */
    public function getSiswaByJadwal(Request $request, $id)
    {
        $user = $request->user();
        $guru = $user->guru;

        $jadwal = Jadwal::with(['kelas'])
            ->where('id', $id)
            ->first();

        if (!$jadwal) {
            return response()->json(['success' => false, 'error' => 'Jadwal tidak ditemukan'], 404);
        }

        if (!$jadwal->kelas) {
            return response()->json(['success' => false, 'error' => 'Kelas tidak ditemukan untuk jadwal ini'], 404);
        }

        // Get siswa list from kelas
        $siswaList = Siswa::where('kelas_id', $jadwal->kelas_id)
            ->where('status', 'Aktif')
            ->orderBy('nama')
            ->get()
            ->map(function ($siswa) {
                return [
                    'id' => $siswa->id,
                    'nama' => $siswa->nama,
                    'nis' => $siswa->nis,
                ];
            });

        return response()->json([
            'success' => true,
            'data' => $siswaList,
            'kelas' => $jadwal->kelas->nama_kelas ?? 'Unknown',
            'total' => $siswaList->count(),
        ]);
    }

    /**
     * Get list of all guru for dropdown selection
     */
    public function getGuruList(Request $request)
    {
        $guruList = \App\Models\Guru::where('status', 'aktif')
            ->orderBy('nama')
            ->get()
            ->map(function ($guru) {
                return [
                    'id' => $guru->id,
                    'nama' => $guru->nama,
                    'nip' => $guru->nip,
                ];
            });

        return response()->json([
            'success' => true,
            'data' => $guruList,
        ]);
    }
}
