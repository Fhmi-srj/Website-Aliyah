<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Siswa;
use App\Models\SiswaKelas;
use App\Models\Guru;
use App\Models\Kelas;
use App\Models\Mapel;
use App\Models\Jadwal;
use App\Models\Kegiatan;
use App\Models\Ekskul;
use App\Models\Rapat;
use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Carbon\Carbon;

class DashboardController extends Controller
{
    /**
     * Get dashboard statistics
     */
    public function statistics(Request $request): JsonResponse
    {
        try {
            $now = Carbon::now();
            $startOfMonth = $now->copy()->startOfMonth();
            $endOfMonth = $now->copy()->endOfMonth();
            $tahunAjaranId = $request->query('tahun_ajaran_id');

            // Count siswa based on tahun_ajaran_id if provided
            if ($tahunAjaranId) {
                $totalSiswa = SiswaKelas::where('tahun_ajaran_id', $tahunAjaranId)->distinct('siswa_id')->count('siswa_id');
                $siswaAktif = SiswaKelas::where('tahun_ajaran_id', $tahunAjaranId)
                    ->whereIn('status', ['Aktif', 'Naik', 'Tinggal'])
                    ->distinct('siswa_id')
                    ->count('siswa_id');
            } else {
                $totalSiswa = Siswa::count();
                $siswaAktif = Siswa::where('status', 'Aktif')->count();
            }

            // Count statistics
            $stats = [
                'total_siswa' => $totalSiswa,
                'siswa_aktif' => $siswaAktif,
                'total_guru' => Guru::count(),
                'guru_aktif' => Guru::where('status', 'Aktif')->count(),
                'total_kelas' => $tahunAjaranId ? Kelas::where('tahun_ajaran_id', $tahunAjaranId)->count() : Kelas::count(),
                'kelas_aktif' => $tahunAjaranId
                    ? Kelas::where('tahun_ajaran_id', $tahunAjaranId)->where('status', 'Aktif')->count()
                    : Kelas::where('status', 'Aktif')->count(),
                'total_mapel' => Mapel::count(),
                'mapel_aktif' => Mapel::where('status', 'Aktif')->count(),
                'total_jadwal' => $tahunAjaranId ? Jadwal::where('tahun_ajaran_id', $tahunAjaranId)->count() : Jadwal::count(),
                'total_kegiatan' => $tahunAjaranId ? Kegiatan::where('tahun_ajaran_id', $tahunAjaranId)->count() : Kegiatan::count(),
                'kegiatan_aktif' => $tahunAjaranId
                    ? Kegiatan::where('tahun_ajaran_id', $tahunAjaranId)->where('status', 'Aktif')->count()
                    : Kegiatan::where('status', 'Aktif')->count(),
                'total_ekskul' => Ekskul::count(),
                'ekskul_aktif' => Ekskul::where('status', 'Aktif')->count(),
                'total_rapat' => Rapat::count(),
                'rapat_bulan_ini' => Rapat::whereBetween('tanggal', [$startOfMonth, $endOfMonth])->count(),
            ];

            return response()->json([
                'success' => true,
                'data' => $stats
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get chart data for distributions
     */
    public function charts(): JsonResponse
    {
        try {
            // Siswa per kelas
            $siswaPerKelas = Kelas::withCount('siswa')
                ->where('status', 'Aktif')
                ->orderBy('tingkat')
                ->orderBy('nama_kelas')
                ->get()
                ->map(fn($k) => [
                    'label' => $k->nama_kelas,
                    'count' => $k->siswa_count
                ]);

            // Guru per jabatan
            $guruPerJabatan = Guru::where('status', 'Aktif')
                ->selectRaw('jabatan, COUNT(*) as count')
                ->groupBy('jabatan')
                ->get()
                ->map(fn($g) => [
                    'label' => $g->jabatan ?: 'Belum Ada',
                    'count' => $g->count
                ]);

            // Kegiatan per bulan (last 6 months)
            $kegiatanPerBulan = [];
            for ($i = 5; $i >= 0; $i--) {
                $month = Carbon::now()->subMonths($i);
                $count = Kegiatan::whereYear('waktu_mulai', $month->year)
                    ->whereMonth('waktu_mulai', $month->month)
                    ->count();
                $kegiatanPerBulan[] = [
                    'label' => $month->format('M Y'),
                    'count' => $count
                ];
            }

            // Ekskul per kategori
            $ekskulPerKategori = Ekskul::where('status', 'Aktif')
                ->selectRaw('kategori, COUNT(*) as count')
                ->groupBy('kategori')
                ->get()
                ->map(fn($e) => [
                    'label' => $e->kategori,
                    'count' => $e->count
                ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'siswa_per_kelas' => $siswaPerKelas,
                    'guru_per_jabatan' => $guruPerJabatan,
                    'kegiatan_per_bulan' => $kegiatanPerBulan,
                    'ekskul_per_kategori' => $ekskulPerKategori,
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get recent activities
     */
    public function recentActivity(): JsonResponse
    {
        try {
            $now = Carbon::now();

            // Upcoming kegiatan (next 7 days)
            $upcomingKegiatan = Kegiatan::where('waktu_mulai', '>=', $now)
                ->where('waktu_mulai', '<=', $now->copy()->addDays(7))
                ->where('status', 'Aktif')
                ->orderBy('waktu_mulai')
                ->limit(5)
                ->get(['id', 'nama_kegiatan', 'waktu_mulai', 'tempat']);

            // Upcoming rapat (next 7 days)
            $upcomingRapat = Rapat::where('tanggal', '>=', $now->toDateString())
                ->where('tanggal', '<=', $now->copy()->addDays(7)->toDateString())
                ->whereIn('status', ['Dijadwalkan', 'Berlangsung'])
                ->orderBy('tanggal')
                ->orderBy('waktu_mulai')
                ->limit(5)
                ->get(['id', 'agenda_rapat', 'tanggal', 'waktu_mulai', 'tempat', 'status']);

            // Recent activities happened
            $recentKegiatan = Kegiatan::where('waktu_berakhir', '<', $now)
                ->orderBy('waktu_berakhir', 'desc')
                ->limit(3)
                ->get(['id', 'nama_kegiatan', 'waktu_berakhir', 'status']);

            // Recent system logs
            $recentLogs = ActivityLog::with('user:id,nama')
                ->orderBy('created_at', 'desc')
                ->limit(10)
                ->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'upcoming_kegiatan' => $upcomingKegiatan,
                    'upcoming_rapat' => $upcomingRapat,
                    'recent_kegiatan' => $recentKegiatan,
                    'recent_logs' => $recentLogs,
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }
}
