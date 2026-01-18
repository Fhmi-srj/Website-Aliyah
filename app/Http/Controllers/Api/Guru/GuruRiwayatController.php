<?php

namespace App\Http\Controllers\Api\Guru;

use App\Http\Controllers\Controller;
use App\Models\AbsensiMengajar;
use App\Models\AbsensiKegiatan;
use App\Models\AbsensiRapat;
use App\Models\Jadwal;
use App\Models\Kegiatan;
use App\Models\Rapat;
use App\Models\AbsensiSiswa;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class GuruRiwayatController extends Controller
{
    /**
     * Get riwayat mengajar grouped by mapel and kelas
     */
    public function riwayatMengajar(Request $request)
    {
        $user = $request->user();
        $guru = $user->guru;

        if (!$guru) {
            return response()->json([
                'success' => false,
                'message' => 'Guru profile not found'
            ], 404);
        }

        $tahunAjaran = $request->input('tahun_ajaran', date('Y') . '/' . (date('Y') + 1));
        $kelasFilter = $request->input('kelas', 'semua');
        $search = $request->input('search', '');

        // Get all jadwal for this guru
        $jadwalQuery = Jadwal::with(['mapel', 'kelas'])
            ->where('guru_id', $guru->id)
            ->where('tahun_ajaran', $tahunAjaran);

        if ($kelasFilter !== 'semua') {
            $jadwalQuery->whereHas('kelas', function ($q) use ($kelasFilter) {
                $q->where('nama', $kelasFilter);
            });
        }

        if ($search) {
            $jadwalQuery->where(function ($q) use ($search) {
                $q->whereHas('mapel', function ($mq) use ($search) {
                    $mq->where('nama', 'like', "%{$search}%");
                })->orWhereHas('kelas', function ($kq) use ($search) {
                    $kq->where('nama', 'like', "%{$search}%");
                });
            });
        }

        $jadwalList = $jadwalQuery->get();

        // Group by mapel and kelas, get pertemuan history
        $result = [];

        foreach ($jadwalList as $jadwal) {
            // Get all absensi mengajar for this jadwal
            $absensiMengajar = AbsensiMengajar::with(['absensiSiswa'])
                ->where('jadwal_id', $jadwal->id)
                ->where('guru_id', $guru->id)
                ->orderBy('tanggal', 'desc')
                ->get();

            if ($absensiMengajar->count() > 0) {
                $pertemuanList = [];
                foreach ($absensiMengajar as $absensi) {
                    $hadir = $absensi->absensiSiswa->where('status', 'H')->count();
                    $izin = $absensi->absensiSiswa->where('status', 'I')->count();
                    $sakit = $absensi->absensiSiswa->where('status', 'S')->count();
                    $alpha = $absensi->absensiSiswa->where('status', 'A')->count();

                    $pertemuanList[] = [
                        'id' => $absensi->id,
                        'tanggal' => Carbon::parse($absensi->tanggal)->translatedFormat('d F Y'),
                        'hadir' => $hadir,
                        'izin' => $izin + $sakit, // Combine izin and sakit
                        'alpha' => $alpha,
                        'total' => $absensi->absensiSiswa->count(),
                        'ringkasan_materi' => $absensi->ringkasan_materi,
                    ];
                }

                $result[] = [
                    'id' => $jadwal->id,
                    'mapel' => $jadwal->mapel->nama ?? 'Unknown',
                    'kelas' => $jadwal->kelas->nama ?? 'Unknown',
                    'time' => substr($jadwal->jam_mulai, 0, 5) . ' - ' . substr($jadwal->jam_selesai, 0, 5),
                    'hari' => $jadwal->hari,
                    'total_pertemuan' => count($pertemuanList),
                    'pertemuan' => $pertemuanList,
                ];
            }
        }

        // Get unique kelas for filter
        $allJadwal = Jadwal::with('kelas')
            ->where('guru_id', $guru->id)
            ->where('tahun_ajaran', $tahunAjaran)
            ->get();
        $kelasList = $allJadwal->pluck('kelas.nama')->unique()->filter()->sort()->values();

        // Get available tahun ajaran
        $tahunAjaranList = Jadwal::where('guru_id', $guru->id)
            ->distinct()
            ->pluck('tahun_ajaran')
            ->sort()
            ->reverse()
            ->values();

        return response()->json([
            'success' => true,
            'data' => $result,
            'filters' => [
                'kelas_list' => $kelasList,
                'tahun_ajaran_list' => $tahunAjaranList,
                'current_tahun_ajaran' => $tahunAjaran,
                'current_kelas' => $kelasFilter,
            ]
        ]);
    }

    /**
     * Get detail pertemuan (siswa list)
     */
    public function detailPertemuan(Request $request, $id)
    {
        $user = $request->user();
        $guru = $user->guru;

        if (!$guru) {
            return response()->json([
                'success' => false,
                'message' => 'Guru profile not found'
            ], 404);
        }

        $absensi = AbsensiMengajar::with(['absensiSiswa.siswa', 'jadwal.mapel', 'jadwal.kelas'])
            ->where('id', $id)
            ->where('guru_id', $guru->id)
            ->first();

        if (!$absensi) {
            return response()->json([
                'success' => false,
                'message' => 'Absensi not found'
            ], 404);
        }

        $siswaList = $absensi->absensiSiswa->map(function ($as) {
            return [
                'id' => $as->id,
                'siswa_id' => $as->siswa_id,
                'nama' => $as->siswa->nama ?? 'Unknown',
                'nis' => $as->siswa->nis ?? '-',
                'status' => $as->status,
                'keterangan' => $as->keterangan,
            ];
        });

        $hadir = $absensi->absensiSiswa->where('status', 'H')->count();
        $izin = $absensi->absensiSiswa->where('status', 'I')->count();
        $sakit = $absensi->absensiSiswa->where('status', 'S')->count();
        $alpha = $absensi->absensiSiswa->where('status', 'A')->count();

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $absensi->id,
                'tanggal' => Carbon::parse($absensi->tanggal)->translatedFormat('d F Y'),
                'mapel' => $absensi->jadwal->mapel->nama ?? 'Unknown',
                'kelas' => $absensi->jadwal->kelas->nama ?? 'Unknown',
                'ringkasan_materi' => $absensi->ringkasan_materi,
                'berita_acara' => $absensi->berita_acara,
                'stats' => [
                    'hadir' => $hadir,
                    'izin' => $izin + $sakit,
                    'alpha' => $alpha,
                    'total' => $absensi->absensiSiswa->count(),
                ],
                'siswa' => $siswaList,
            ]
        ]);
    }

    /**
     * Get riwayat kegiatan for this guru
     */
    public function riwayatKegiatan(Request $request)
    {
        $user = $request->user();
        $guru = $user->guru;

        if (!$guru) {
            return response()->json([
                'success' => false,
                'message' => 'Guru profile not found'
            ], 404);
        }

        $search = $request->input('search', '');

        // Get kegiatan where guru is PJ, pendamping, or has absensi
        $kegiatanQuery = Kegiatan::with(['penanggungJawab', 'guruPendamping'])
            ->where(function ($q) use ($guru) {
                $q->where('penanggung_jawab_id', $guru->id)
                    ->orWhereHas('guruPendamping', function ($pq) use ($guru) {
                        $pq->where('guru_id', $guru->id);
                    });
            })
            ->orderBy('tanggal', 'desc');

        if ($search) {
            $kegiatanQuery->where('nama', 'like', "%{$search}%");
        }

        $kegiatanList = $kegiatanQuery->get();

        $result = $kegiatanList->map(function ($kegiatan) use ($guru) {
            $role = 'Peserta';
            if ($kegiatan->penanggung_jawab_id == $guru->id) {
                $role = 'PJ';
            } elseif ($kegiatan->guruPendamping->contains('id', $guru->id)) {
                $role = 'Pendamping';
            }

            // Check if already attended
            $absensi = AbsensiKegiatan::where('kegiatan_id', $kegiatan->id)
                ->where('guru_id', $guru->id)
                ->first();

            return [
                'id' => $kegiatan->id,
                'nama' => $kegiatan->nama,
                'tanggal' => Carbon::parse($kegiatan->tanggal)->translatedFormat('d F Y'),
                'time' => substr($kegiatan->jam_mulai, 0, 5) . ' - ' . substr($kegiatan->jam_selesai, 0, 5),
                'role' => $role,
                'status_absensi' => $absensi ? $absensi->status : null,
                'lokasi' => $kegiatan->lokasi,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $result,
        ]);
    }

    /**
     * Get riwayat rapat for this guru
     */
    public function riwayatRapat(Request $request)
    {
        $user = $request->user();
        $guru = $user->guru;

        if (!$guru) {
            return response()->json([
                'success' => false,
                'message' => 'Guru profile not found'
            ], 404);
        }

        $search = $request->input('search', '');

        // Get rapat where guru is pimpinan, sekretaris, or peserta
        $rapatQuery = Rapat::with(['pimpinan', 'sekretaris'])
            ->where(function ($q) use ($guru) {
                $q->where('pimpinan_id', $guru->id)
                    ->orWhere('sekretaris_id', $guru->id)
                    ->orWhereJsonContains('peserta', $guru->id);
            })
            ->orderBy('tanggal', 'desc');

        if ($search) {
            $rapatQuery->where('nama', 'like', "%{$search}%");
        }

        $rapatList = $rapatQuery->get();

        $result = $rapatList->map(function ($rapat) use ($guru) {
            $role = 'Peserta';
            if ($rapat->pimpinan_id == $guru->id) {
                $role = 'Pimpinan';
            } elseif ($rapat->sekretaris_id == $guru->id) {
                $role = 'Sekretaris';
            }

            // Check if already attended
            $absensi = AbsensiRapat::where('rapat_id', $rapat->id)
                ->where('guru_id', $guru->id)
                ->first();

            return [
                'id' => $rapat->id,
                'nama' => $rapat->nama,
                'tanggal' => Carbon::parse($rapat->tanggal)->translatedFormat('d F Y'),
                'time' => substr($rapat->jam_mulai, 0, 5) . ' - ' . substr($rapat->jam_selesai, 0, 5),
                'role' => $role,
                'status_absensi' => $absensi ? $absensi->status : null,
                'lokasi' => $rapat->lokasi,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $result,
        ]);
    }
}
