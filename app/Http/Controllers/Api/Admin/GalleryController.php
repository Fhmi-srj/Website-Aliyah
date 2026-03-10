<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AbsensiMengajar;
use App\Models\AbsensiKegiatan;
use App\Models\AbsensiRapat;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;

class GalleryController extends Controller
{
    /**
     * Get all photos from mengajar, kegiatan, and rapat.
     * Supports filtering by type, month, year, search.
     * Stats are always calculated from ALL photos (ignoring type filter) to prevent counter bugs.
     */
    public function index(Request $request): JsonResponse
    {
        $type = $request->query('type', 'all');
        $month = $request->query('month');
        $year = $request->query('year');
        $search = $request->query('search');
        $perPage = min((int) $request->query('per_page', 30), 100);

        // Helper to get file size from URL
        $getFileSize = function ($url) {
            try {
                // Convert URL to storage path
                $path = str_replace('/storage/', '', parse_url($url, PHP_URL_PATH));
                if ($path && Storage::disk('public')->exists($path)) {
                    return Storage::disk('public')->size($path);
                }
            } catch (\Throwable $e) {
                // ignore
            }
            return null;
        };

        // Collect photos — always collect ALL for stats, then filter for display
        $allPhotos = collect();

        // 1. Photos from Absensi Mengajar (mengajar + penilaian)
        $mengajarQuery = AbsensiMengajar::with(['guru:id,nama', 'jadwal.mapel', 'jadwal.kelas'])
            ->whereNotNull('foto_mengajar')
            ->where('foto_mengajar', '!=', '[]')
            ->where('foto_mengajar', '!=', 'null');

        if ($month)
            $mengajarQuery->whereMonth('tanggal', $month);
        if ($year)
            $mengajarQuery->whereYear('tanggal', $year);
        if ($search) {
            $mengajarQuery->where(function ($q) use ($search) {
                $q->where('snapshot_mapel', 'like', "%{$search}%")
                    ->orWhere('snapshot_kelas', 'like', "%{$search}%")
                    ->orWhere('snapshot_guru_nama', 'like', "%{$search}%")
                    ->orWhere('ringkasan_materi', 'like', "%{$search}%");
            });
        }

        foreach ($mengajarQuery->orderBy('tanggal', 'desc')->get() as $absensi) {
            $fotoArr = is_array($absensi->foto_mengajar) ? $absensi->foto_mengajar : json_decode($absensi->foto_mengajar, true);
            if (!is_array($fotoArr) || empty($fotoArr))
                continue;

            $photoType = $absensi->jenis_kegiatan === 'ulangan' ? 'penilaian' : 'mengajar';
            $displayInfo = $absensi->getDisplayInfo();

            foreach ($fotoArr as $url) {
                $allPhotos->push([
                    'id' => "mengajar_{$absensi->id}_" . md5($url),
                    'type' => $photoType,
                    'url' => $url,
                    'guru_nama' => $displayInfo['guru_nama'],
                    'label' => $displayInfo['mapel'] . ' - ' . $displayInfo['kelas'],
                    'sublabel' => $absensi->ringkasan_materi,
                    'tanggal' => $absensi->tanggal?->format('Y-m-d'),
                    'file_size' => $getFileSize($url),
                    'created_at' => $absensi->created_at?->toIso8601String(),
                ]);
            }
        }

        // 2. Photos from Absensi Kegiatan
        $kegiatanQuery = AbsensiKegiatan::with(['kegiatan', 'kegiatan.penanggungJawab:id,nama'])
            ->whereNotNull('foto_kegiatan')
            ->where('foto_kegiatan', '!=', '[]')
            ->where('foto_kegiatan', '!=', 'null');

        if ($month)
            $kegiatanQuery->whereMonth('tanggal', $month);
        if ($year)
            $kegiatanQuery->whereYear('tanggal', $year);
        if ($search) {
            $kegiatanQuery->whereHas('kegiatan', function ($q) use ($search) {
                $q->where('nama_kegiatan', 'like', "%{$search}%");
            });
        }

        foreach ($kegiatanQuery->orderBy('tanggal', 'desc')->get() as $absensi) {
            $fotoArr = is_array($absensi->foto_kegiatan) ? $absensi->foto_kegiatan : json_decode($absensi->foto_kegiatan, true);
            if (!is_array($fotoArr) || empty($fotoArr))
                continue;

            $kegiatan = $absensi->kegiatan;
            foreach ($fotoArr as $url) {
                $allPhotos->push([
                    'id' => "kegiatan_{$absensi->id}_" . md5($url),
                    'type' => 'kegiatan',
                    'url' => $url,
                    'guru_nama' => $kegiatan?->penanggungJawab?->nama ?? '-',
                    'label' => $kegiatan?->nama_kegiatan ?? '-',
                    'sublabel' => $kegiatan?->tempat,
                    'tanggal' => $absensi->tanggal?->format('Y-m-d'),
                    'file_size' => $getFileSize($url),
                    'created_at' => $absensi->created_at?->toIso8601String(),
                ]);
            }
        }

        // 3. Photos from Absensi Rapat
        $rapatQuery = AbsensiRapat::with(['rapat', 'rapat.pimpinan:id,nama'])
            ->whereNotNull('foto_rapat')
            ->where('foto_rapat', '!=', '[]')
            ->where('foto_rapat', '!=', 'null');

        if ($month)
            $rapatQuery->whereMonth('tanggal', $month);
        if ($year)
            $rapatQuery->whereYear('tanggal', $year);
        if ($search) {
            $rapatQuery->whereHas('rapat', function ($q) use ($search) {
                $q->where('agenda_rapat', 'like', "%{$search}%");
            });
        }

        foreach ($rapatQuery->orderBy('tanggal', 'desc')->get() as $absensi) {
            $fotoArr = is_array($absensi->foto_rapat) ? $absensi->foto_rapat : json_decode($absensi->foto_rapat, true);
            if (!is_array($fotoArr) || empty($fotoArr))
                continue;

            $rapat = $absensi->rapat;
            foreach ($fotoArr as $url) {
                $allPhotos->push([
                    'id' => "rapat_{$absensi->id}_" . md5($url),
                    'type' => 'rapat',
                    'url' => $url,
                    'guru_nama' => $rapat?->pimpinan?->nama ?? '-',
                    'label' => $rapat?->agenda_rapat ?? '-',
                    'sublabel' => $rapat?->tempat,
                    'tanggal' => $absensi->tanggal?->format('Y-m-d'),
                    'file_size' => $getFileSize($url),
                    'created_at' => $absensi->created_at?->toIso8601String(),
                ]);
            }
        }

        // Sort all photos by date descending
        $sorted = $allPhotos->sortByDesc('tanggal')->values();

        // Stats are ALWAYS calculated from ALL photos (before type filter)
        $stats = [
            'mengajar' => $sorted->where('type', 'mengajar')->count(),
            'penilaian' => $sorted->where('type', 'penilaian')->count(),
            'kegiatan' => $sorted->where('type', 'kegiatan')->count(),
            'rapat' => $sorted->where('type', 'rapat')->count(),
            'total' => $sorted->count(),
        ];

        // Apply type filter AFTER calculating stats
        if ($type !== 'all') {
            $sorted = $sorted->where('type', $type)->values();
        }

        // Manual pagination on filtered collection
        $page = max(1, (int) $request->query('page', 1));
        $offset = ($page - 1) * $perPage;
        $filteredCount = $sorted->count();
        $paginated = $sorted->slice($offset, $perPage)->values();

        return response()->json([
            'success' => true,
            'data' => $paginated,
            'stats' => $stats,
            'pagination' => [
                'current_page' => $page,
                'per_page' => $perPage,
                'total' => $filteredCount,
                'last_page' => (int) ceil($filteredCount / $perPage),
            ],
        ]);
    }
}
