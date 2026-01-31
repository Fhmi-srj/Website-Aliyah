<?php

namespace App\Http\Controllers\Api\Guru;

use App\Http\Controllers\Controller;
use App\Models\Jadwal;
use App\Models\AbsensiMengajar;
use App\Models\AbsensiSiswa;
use App\Models\Siswa;
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

        // Get jadwal for today
        $jadwalList = Jadwal::with(['mapel', 'kelas'])
            ->where('guru_id', $guru->id)
            ->where('hari', $dayName)
            ->where('status', 'Aktif')
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

            if ($absensi) {
                $status = 'sudah_absen'; // hijau
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

        foreach ($days as $day) {
            $jadwalList = Jadwal::with(['mapel', 'kelas'])
                ->where('guru_id', $guru->id)
                ->where('hari', $day)
                ->where('status', 'Aktif')
                ->orderBy('jam_mulai')
                ->get();

            $dayResult = [];

            foreach ($jadwalList as $jadwal) {
                // Only check absensi status for today
                $status = 'belum_mulai';

                if ($day === $todayName) {
                    $absensi = AbsensiMengajar::where('jadwal_id', $jadwal->id)
                        ->where('tanggal', $today->toDateString())
                        ->first();

                    $jamMulai = Carbon::parse($today->toDateString() . ' ' . $jadwal->jam_mulai);
                    $jamSelesai = Carbon::parse($today->toDateString() . ' ' . $jadwal->jam_selesai);

                    if ($absensi) {
                        $status = 'sudah_absen';
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
                ];
            }

            $result[$day] = $dayResult;
        }

        return response()->json([
            'jadwal' => $result,
            'tanggal' => $today->locale('id')->translatedFormat('l, d F Y'),
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

        // Get existing absensi if any
        $absensi = AbsensiMengajar::with('absensiSiswa')
            ->where('jadwal_id', $jadwal->id)
            ->where('tanggal', $today->toDateString())
            ->first();

        // Get siswa list
        $siswaList = $jadwal->kelas->siswa()
            ->where('status', 'Aktif')
            ->orderBy('nama')
            ->get()
            ->map(function ($siswa) use ($absensi) {
                $absensiSiswa = null;
                if ($absensi) {
                    $absensiSiswa = $absensi->absensiSiswa->where('siswa_id', $siswa->id)->first();
                }
                return [
                    'id' => $siswa->id,
                    'nama' => $siswa->nama,
                    'nis' => $siswa->nis,
                    'status' => $absensiSiswa?->status ?? 'H',
                    'keterangan' => $absensiSiswa?->keterangan ?? '',
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
        $user = $request->user();
        $guru = $user->guru;

        $validated = $request->validate([
            'jadwal_id' => 'required|exists:jadwal,id',
            'ringkasan_materi' => 'nullable|string',
            'berita_acara' => 'nullable|string',
            'guru_status' => 'nullable|in:H,I',
            'guru_keterangan' => 'nullable|string',
            'absensi_siswa' => 'required|array',
            'absensi_siswa.*.siswa_id' => 'required|exists:siswa,id',
            'absensi_siswa.*.status' => 'required|in:H,I,A',
            'absensi_siswa.*.keterangan' => 'nullable|string',
        ]);

        // Use explicit Jakarta timezone
        $today = Carbon::today('Asia/Jakarta');
        $now = Carbon::now('Asia/Jakarta');

        // Verify jadwal belongs to this guru
        $jadwal = Jadwal::where('id', $validated['jadwal_id'])
            ->where('guru_id', $guru->id)
            ->first();

        if (!$jadwal) {
            return response()->json(['error' => 'Jadwal tidak valid'], 403);
        }

        // Check if already exists
        $absensi = AbsensiMengajar::where('jadwal_id', $jadwal->id)
            ->where('tanggal', $today->toDateString())
            ->first();

        if ($absensi) {
            return response()->json(['error' => 'Absensi sudah dilakukan untuk jadwal ini hari ini'], 400);
        }

        // Create absensi mengajar with guru_status
        $guruStatus = $validated['guru_status'] ?? 'H';
        $absensi = AbsensiMengajar::create([
            'jadwal_id' => $jadwal->id,
            'guru_id' => $guru->id,
            'tanggal' => $today->toDateString(),
            'ringkasan_materi' => $validated['ringkasan_materi'] ?? null,
            'berita_acara' => $validated['berita_acara'] ?? null,
            'status' => 'hadir',
            'guru_status' => $guruStatus,
            'guru_keterangan' => $guruStatus === 'I' ? ($validated['guru_keterangan'] ?? null) : null,
            'absensi_time' => $now,
        ]);

        // Create absensi siswa
        foreach ($validated['absensi_siswa'] as $siswaData) {
            AbsensiSiswa::create([
                'absensi_mengajar_id' => $absensi->id,
                'siswa_id' => $siswaData['siswa_id'],
                'status' => $siswaData['status'],
                'keterangan' => $siswaData['keterangan'] ?? null,
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Absensi berhasil disimpan',
            'data' => $absensi,
        ], 201);
    }
}
