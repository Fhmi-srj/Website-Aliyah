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
                $q->where('nama_kelas', $kelasFilter);
            });
        }

        if ($search) {
            $jadwalQuery->where(function ($q) use ($search) {
                $q->whereHas('mapel', function ($mq) use ($search) {
                    $mq->where('nama_mapel', 'like', "%{$search}%");
                })->orWhereHas('kelas', function ($kq) use ($search) {
                    $kq->where('nama_kelas', 'like', "%{$search}%");
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
                    'mapel' => $jadwal->mapel->nama_mapel ?? 'Unknown',
                    'kelas' => $jadwal->kelas->nama_kelas ?? 'Unknown',
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
        $kelasList = $allJadwal->pluck('kelas.nama_kelas')->unique()->filter()->sort()->values();

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
                'mapel' => $absensi->jadwal->mapel->nama_mapel ?? 'Unknown',
                'kelas' => $absensi->jadwal->kelas->nama_kelas ?? 'Unknown',
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

        // Get kegiatan where guru is PJ or in pendamping array
        $kegiatanQuery = Kegiatan::where(function ($q) use ($guru) {
            $q->where('penanggung_jawab_id', $guru->id)
                ->orWhereJsonContains('guru_pendamping', $guru->id)
                ->orWhereJsonContains('guru_pendamping', (string) $guru->id);
        })
            ->whereNotNull('waktu_mulai')
            ->orderBy('waktu_mulai', 'desc');

        if ($search) {
            $kegiatanQuery->where('nama_kegiatan', 'like', "%{$search}%");
        }

        $kegiatanList = $kegiatanQuery->get();

        $result = $kegiatanList->map(function ($kegiatan) use ($guru) {
            $role = 'Peserta';
            $isPJ = $kegiatan->penanggung_jawab_id == $guru->id;
            if ($isPJ) {
                $role = 'PJ';
            } else {
                $pendampingArr = $kegiatan->guru_pendamping ?? [];
                if (is_array($pendampingArr) && (in_array($guru->id, $pendampingArr) || in_array((string) $guru->id, $pendampingArr))) {
                    $role = 'Pendamping';
                }
            }

            $waktuMulai = Carbon::parse($kegiatan->waktu_mulai);
            $waktuSelesai = $kegiatan->waktu_berakhir ? Carbon::parse($kegiatan->waktu_berakhir) : $waktuMulai->copy()->addHours(2);

            return [
                'id' => $kegiatan->id,
                'nama' => $kegiatan->nama_kegiatan,
                'tanggal' => $waktuMulai->translatedFormat('d F Y'),
                'time' => $waktuMulai->format('H:i') . ' - ' . $waktuSelesai->format('H:i'),
                'role' => $role,
                'status_absensi' => null,
                'lokasi' => $kegiatan->tempat,
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

        // Get rapat where guru is pimpinan, sekretaris, or in peserta_rapat array
        $rapatQuery = Rapat::where(function ($q) use ($guru) {
            $q->where('pimpinan_id', $guru->id)
                ->orWhere('sekretaris_id', $guru->id)
                ->orWhereJsonContains('peserta_rapat', $guru->id)
                ->orWhereJsonContains('peserta_rapat', (string) $guru->id);
        })
            ->orderBy('tanggal', 'desc');

        if ($search) {
            $rapatQuery->where('agenda_rapat', 'like', "%{$search}%");
        }

        $rapatList = $rapatQuery->get();

        $result = $rapatList->map(function ($rapat) use ($guru) {
            $role = 'Peserta';
            if ($rapat->pimpinan_id == $guru->id) {
                $role = 'Pimpinan';
            } elseif ($rapat->sekretaris_id == $guru->id) {
                $role = 'Sekretaris';
            }

            return [
                'id' => $rapat->id,
                'nama' => $rapat->agenda_rapat,
                'tanggal' => Carbon::parse($rapat->tanggal)->translatedFormat('d F Y'),
                'time' => substr($rapat->waktu_mulai, 0, 5) . ' - ' . substr($rapat->waktu_selesai, 0, 5),
                'role' => $role,
                'status_absensi' => null,
                'lokasi' => $rapat->tempat,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $result,
        ]);
    }
}
