<?php

namespace App\Http\Controllers\Api\Siswa;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\NilaiSiswa;

class SiswaPenilaianController extends Controller
{
    public function index(Request $request)
    {
        $siswa = $request->user();
        if (!$siswa) {
            return response()->json(['message' => 'Akses ditolak.'], 403);
        }

        $query = NilaiSiswa::with(['absensiMengajar.jadwal.mapel', 'absensiMengajar.guru'])
            ->where('siswa_id', $siswa->id)
            ->whereHas('absensiMengajar', function ($q) {
                $q->where('jenis_kegiatan', 'ulangan');
            });

        // Filter mapel
        if ($request->filled('mapel')) {
            $query->whereHas('absensiMengajar', function ($q) use ($request) {
                $q->where('snapshot_mapel', $request->mapel)
                  ->orWhereHas('jadwal.mapel', function ($q2) use ($request) {
                      $q2->where('nama_mapel', $request->mapel);
                  });
            });
        }

        // Filter jenis ulangan
        if ($request->filled('jenis_ulangan')) {
            $query->whereHas('absensiMengajar', function ($q) use ($request) {
                $q->where('jenis_ulangan', $request->jenis_ulangan);
            });
        }

        // Get and sort by tanggal
        $nilaiList = $query->get()->sortByDesc(function ($nilai) {
            return $nilai->absensiMengajar->tanggal ?? '2000-01-01';
        })->values()->map(function ($nilai) {
            $absensi = $nilai->absensiMengajar;
            $mapel = $absensi->snapshot_mapel ?? $absensi->jadwal?->mapel?->nama_mapel ?? 'Mapel Tidak Diketahui';
            
            return [
                'id' => $nilai->id,
                'jenis_ulangan' => $absensi->jenis_ulangan,
                'jenis_ulangan_label' => $this->getLabelUlangan($absensi->jenis_ulangan),
                'mapel' => $mapel,
                'guru' => $absensi->snapshot_guru_nama ?? $absensi->guru?->nama ?? '-',
                'tanggal' => $absensi->tanggal ? date('d-m-Y', strtotime($absensi->tanggal)) : '-',
                'materi' => $absensi->ringkasan_materi ?? 'Penilaian',
                'nilai' => $nilai->nilai,
                'keterangan' => $nilai->keterangan,
            ];
        });

        $uniqueMapel = $nilaiList->pluck('mapel')->unique()->sort()->values();

        // Valid nilai summary (excluding null or empty string)
        $validNilai = $nilaiList->filter(function ($item) {
            return $item['nilai'] !== null && $item['nilai'] !== '';
        });

        return response()->json([
            'data' => $nilaiList,
            'filters' => [
                'mapel' => $uniqueMapel
            ],
            'summary' => [
                'total' => $validNilai->count(),
                'rata_rata' => $validNilai->count() > 0 ? round($validNilai->avg('nilai'), 2) : 0
            ]
        ]);
    }

    private function getLabelUlangan(?string $jenis): string
    {
        $map = [
            'ulangan_harian' => 'Penilaian Harian',
            'uts' => 'UTS',
            'uas' => 'UAS',
            'quiz' => 'Quiz',
        ];
        return $map[$jenis] ?? 'Penilaian';
    }
}
