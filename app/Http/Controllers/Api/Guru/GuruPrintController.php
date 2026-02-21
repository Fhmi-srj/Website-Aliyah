<?php

namespace App\Http\Controllers\Api\Guru;

use App\Http\Controllers\Controller;
use App\Models\Guru;
use App\Models\Kelas;
use App\Models\Jadwal;
use App\Models\Kegiatan;
use App\Models\Rapat;
use App\Models\AbsensiMengajar;
use App\Models\AbsensiKegiatan;
use App\Models\AbsensiRapat;
use App\Models\AbsensiSiswa;
use App\Models\SiswaKelas;
use App\Models\TahunAjaran;
use App\Services\PrintService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class GuruPrintController extends Controller
{
    /**
     * Print Jurnal Guru (Teacher's Teaching Journal)
     * Accepts optional guru_id param for admin access.
     */
    public function jurnalGuru(Request $request)
    {
        // Support admin usage: if guru_id is provided, use that guru
        $guruId = $request->input('guru_id');
        if ($guruId) {
            $guru = Guru::find($guruId);
        } else {
            $user = $request->user();
            $guru = $user?->guru;
        }

        if (!$guru) {
            return response()->json(['message' => 'Data guru tidak ditemukan'], 404);
        }

        // Get filters
        $bulan = $request->input('bulan'); // Format: YYYY-MM
        $mapelId = $request->input('mapel_id');
        $kelasId = $request->input('kelas_id');
        $tahunAjaranId = $request->input('tahun_ajaran_id') ?? TahunAjaran::getActive()?->id;

        // Build query for absensi mengajar
        $query = AbsensiMengajar::with(['jadwal.mapel', 'jadwal.kelas', 'jadwal.jamPelajaran', 'jadwal.jamPelajaranSampai'])
            ->whereHas('jadwal', function ($q) use ($guru, $tahunAjaranId, $mapelId, $kelasId) {
                $q->where('guru_id', $guru->id);
                if ($tahunAjaranId) {
                    $q->where('tahun_ajaran_id', $tahunAjaranId);
                }
                if ($mapelId) {
                    $q->where('mapel_id', $mapelId);
                }
                if ($kelasId) {
                    $q->where('kelas_id', $kelasId);
                }
            })
            ->orderBy('tanggal', 'asc');

        // Filter by month
        if ($bulan) {
            $query->where('tanggal', 'like', $bulan . '%');
        }

        $absensiData = $query->get();

        // Format data for view
        $data = [];
        $rekap = ['total' => 0, 'hadir' => 0, 'izin' => 0, 'sakit' => 0, 'alpha' => 0];

        // Indonesian day names
        $hariIndonesia = [
            'Sunday' => 'Minggu',
            'Monday' => 'Senin',
            'Tuesday' => 'Selasa',
            'Wednesday' => 'Rabu',
            'Thursday' => 'Kamis',
            'Friday' => 'Jumat',
            'Saturday' => 'Sabtu',
        ];

        foreach ($absensiData as $absensi) {
            $jadwal = $absensi->jadwal;
            $status = strtolower($absensi->guru_status ?? $absensi->status);
            $tanggalCarbon = Carbon::parse($absensi->tanggal);

            // Count siswa attendance from snapshot counts in absensi_mengajar
            $siswaHadir = $absensi->siswa_hadir ?? 0;
            $siswaSakit = $absensi->siswa_sakit ?? 0;
            $siswaIzin = $absensi->siswa_izin ?? 0;
            $siswaAlpha = $absensi->siswa_alpha ?? 0;

            // Fallback to daily query if snapshot is empty (old data)
            $totalSnapshot = $siswaHadir + $siswaSakit + $siswaIzin + $siswaAlpha;
            if ($totalSnapshot === 0) {
                $kelasIdForCount = $jadwal?->kelas_id;
                if ($kelasIdForCount) {
                    $dailyCounts = AbsensiSiswa::where('kelas_id', $kelasIdForCount)
                        ->where('tanggal', Carbon::parse($absensi->tanggal)->format('Y-m-d'))
                        ->selectRaw("status, count(*) as cnt")
                        ->groupBy('status')
                        ->pluck('cnt', 'status')
                        ->toArray();

                    $totalSiswa = \App\Models\Siswa::where('kelas_id', $kelasIdForCount)->where('status', 'Aktif')->count();
                    $siswaSakit = $dailyCounts['S'] ?? 0;
                    $siswaIzin = $dailyCounts['I'] ?? 0;
                    $siswaAlpha = $dailyCounts['A'] ?? 0;
                    $siswaHadir = $totalSiswa - ($siswaSakit + $siswaIzin + $siswaAlpha);
                }
            }

            // Get jam ke from jam_pelajaran relations - format as "1-2" or just "1"
            $jamKeStart = $jadwal->jamPelajaran->jam_ke ?? $jadwal->jam_ke ?? null;
            $jamKeEnd = $jadwal->jamPelajaranSampai->jam_ke ?? null;

            if ($jamKeStart && $jamKeEnd && $jamKeStart != $jamKeEnd) {
                $jamKe = $jamKeStart . '-' . $jamKeEnd;
            } elseif ($jamKeStart) {
                $jamKe = $jamKeStart;
            } else {
                $jamKe = '-';
            }

            $data[] = [
                'tanggal' => PrintService::formatDate($absensi->tanggal),
                'tanggal_short' => $tanggalCarbon->format('d/m/Y'),
                'hari' => $absensi->snapshot_hari ?? ($hariIndonesia[$tanggalCarbon->format('l')] ?? $tanggalCarbon->format('l')),
                'jam' => PrintService::formatTime($jadwal->jam_mulai ?? null),
                'jam_ke' => $jamKe,
                'kelas' => $absensi->snapshot_kelas ?? $jadwal->kelas->nama_kelas ?? '-',
                'mapel' => $absensi->snapshot_mapel ?? $jadwal->mapel->nama_mapel ?? '-',
                'materi' => $absensi->ringkasan_materi ?? '-',
                'berita_acara' => $absensi->berita_acara ?? '-',
                'siswa_hadir' => $siswaHadir,
                'siswa_sakit' => $siswaSakit,
                'siswa_izin' => $siswaIzin,
                'siswa_alpha' => $siswaAlpha,
                'status' => ucfirst($status),
                'status_class' => PrintService::getStatusClass($status),
            ];

            $rekap['total']++;

            // Map guru_status (H/I/S/A) to rekap keys
            $statusUpper = strtoupper(trim($absensi->guru_status ?? $absensi->status ?? 'H'));
            $statusMap = [
                'H' => 'hadir',
                'HADIR' => 'hadir',
                'I' => 'izin',
                'IZIN' => 'izin',
                'S' => 'sakit',
                'SAKIT' => 'sakit',
                'A' => 'alpha',
                'ALPHA' => 'alpha',
            ];
            $rekapKey = $statusMap[$statusUpper] ?? 'hadir';
            $rekap[$rekapKey]++;
        }

        // Determine periode label
        if ($bulan) {
            $periode = Carbon::parse($bulan . '-01')->locale('id')->translatedFormat('F Y');
        } else {
            // Use school year format: Juli [tahun] s/d [last month from data]
            if (count($data) > 0) {
                $dates = array_map(function ($item) {
                    // Use createFromFormat for d/m/Y format
                    return Carbon::createFromFormat('d/m/Y', $item['tanggal_short']);
                }, $data);
                $maxDate = max($dates);

                // Determine school year start (July)
                // If current month < July, school year started previous year
                $tahunAjaranStart = $maxDate->month >= 7 ? $maxDate->year : $maxDate->year - 1;
                $startPeriode = Carbon::create($tahunAjaranStart, 7, 1)->locale('id')->translatedFormat('F Y');
                $endPeriode = $maxDate->locale('id')->translatedFormat('F Y');

                $periode = $startPeriode . ' s/d ' . $endPeriode;
            } else {
                $periode = '-';
            }
        }

        // Get filter labels
        $mapelFilter = null;
        $kelasFilter = null;
        if ($mapelId) {
            $mapel = \App\Models\Mapel::find($mapelId);
            $mapelFilter = $mapel?->nama_mapel;
        }
        if ($kelasId) {
            $kelas = Kelas::find($kelasId);
            $kelasFilter = $kelas?->nama_kelas;
        }

        $qrData = PrintService::createVerification(
            'Jurnal Mengajar Guru',
            'Jurnal Mengajar ' . $guru->nama,
            now()->toDateString()
        );

        return view('print.jurnal-guru', [
            'kopUrl' => PrintService::getKopUrl(),
            'guru' => $guru,
            'data' => $data,
            'rekap' => $rekap,
            'periode' => $periode,
            'mapelFilter' => $mapelFilter,
            'kelasFilter' => $kelasFilter,
            'tanggalCetak' => PrintService::formatDate(now()),
            'kepalaSekolah' => PrintService::getKepalaSekolah(),
            'qrCode' => $qrData['qrCode'],
        ]);
    }

    /**
     * Print Jurnal Kelas (Class Learning Journal)
     */
    public function jurnalKelas(Request $request, $kelasId)
    {
        $kelas = Kelas::with('waliKelas')->find($kelasId);

        if (!$kelas) {
            return response()->json(['message' => 'Kelas tidak ditemukan'], 404);
        }

        $bulan = $request->input('bulan');
        $tahunAjaranId = $request->input('tahun_ajaran_id') ?? TahunAjaran::getActive()?->id;

        // Get all absensi mengajar for this class
        $query = AbsensiMengajar::with(['jadwal.mapel', 'jadwal.guru'])
            ->whereHas('jadwal', function ($q) use ($kelasId, $tahunAjaranId) {
                $q->where('kelas_id', $kelasId);
                if ($tahunAjaranId) {
                    $q->where('tahun_ajaran_id', $tahunAjaranId);
                }
            })
            ->orderBy('tanggal', 'asc');

        if ($bulan) {
            $query->where('tanggal', 'like', $bulan . '%');
        }

        $absensiData = $query->get();

        $data = [];
        foreach ($absensiData as $absensi) {
            $jadwal = $absensi->jadwal;
            $status = strtolower($absensi->status);

            $data[] = [
                'tanggal' => PrintService::formatDate($absensi->tanggal),
                'jam' => PrintService::formatTime($jadwal->jam_mulai),
                'mapel' => $jadwal->mapel->nama_mapel ?? '-',
                'guru' => $jadwal->guru->nama ?? '-',
                'materi' => $absensi->materi ?? '-',
                'status' => ucfirst($absensi->status),
                'status_class' => PrintService::getStatusClass($status),
            ];
        }

        $periode = 'Semua';
        if ($bulan) {
            $periode = Carbon::parse($bulan . '-01')->locale('id')->translatedFormat('F Y');
        }

        $tahunAjaran = TahunAjaran::find($tahunAjaranId);

        // Generate QR code verification for Kepala Madrasah
        $qrData = PrintService::createVerification(
            'Jurnal Kelas',
            'Jurnal Pembelajaran Kelas ' . ($kelas->nama_kelas ?? ''),
            now()->toDateString(),
            ['kelas' => $kelas->nama_kelas ?? '-', 'wali_kelas' => $kelas->waliKelas->nama ?? '-']
        );

        return view('print.jurnal-kelas', [
            'kopUrl' => PrintService::getKopUrl(),
            'kelas' => $kelas,
            'data' => $data,
            'tahunAjaran' => $tahunAjaran ? $tahunAjaran->nama : '-',
            'periode' => $periode,
            'tanggalCetak' => PrintService::formatDate(now()),
            'kepalaSekolah' => PrintService::getKepalaSekolah(),
            'qrCode' => $qrData['qrCode'],
        ]);
    }

    /**
     * Print Hasil Rapat (Single Meeting Report)
     */
    public function hasilRapat(Request $request, $absensiId)
    {
        $absensi = AbsensiRapat::with(['rapat.pimpinanGuru', 'rapat.sekretarisGuru'])
            ->find($absensiId);

        if (!$absensi) {
            return response()->json(['message' => 'Data absensi rapat tidak ditemukan'], 404);
        }

        $rapat = $absensi->rapat;

        // Helper to get jabatan from User role
        $getJabatan = function ($guru) {
            if (!$guru)
                return '-';
            $user = \App\Models\User::where('guru_id', $guru->id)->with('roles')->first();
            if ($user && $user->roles->count() > 0) {
                return ucwords(str_replace('_', ' ', $user->roles->first()->name ?? ''));
            }
            return $guru->jabatan ?? '-';
        };

        // Parse peserta attendance
        $pesertaRaw = $absensi->absensi_peserta ?? [];
        $peserta = [];
        $rekap = ['hadir' => 0, 'izin' => 0, 'sakit' => 0, 'alpha' => 0];
        $addedGuruIds = [];

        // Map for status conversion
        $statusMap = [
            'H' => 'hadir',
            'HADIR' => 'hadir',
            'I' => 'izin',
            'IZIN' => 'izin',
            'S' => 'sakit',
            'SAKIT' => 'sakit',
            'A' => 'alpha',
            'ALPHA' => 'alpha',
        ];

        // Auto-include Pimpinan as Hadir (first in list)
        if ($rapat->pimpinanGuru) {
            $pimpinan = $rapat->pimpinanGuru;
            $peserta[] = [
                'nama' => $pimpinan->nama,
                'jabatan' => $getJabatan($pimpinan),
                'status' => 'Hadir',
                'status_class' => PrintService::getStatusClass('hadir'),
                'keterangan' => null,
                'ttd' => $pimpinan->ttd ? asset('storage/' . $pimpinan->ttd) : null,
            ];
            $addedGuruIds[] = $pimpinan->id;
            $rekap['hadir']++;
        }

        // Auto-include Sekretaris as Hadir (second in list)
        if ($rapat->sekretarisGuru && !in_array($rapat->sekretarisGuru->id, $addedGuruIds)) {
            $sekretaris = $rapat->sekretarisGuru;
            $peserta[] = [
                'nama' => $sekretaris->nama,
                'jabatan' => $getJabatan($sekretaris),
                'status' => 'Hadir',
                'status_class' => PrintService::getStatusClass('hadir'),
                'keterangan' => null,
                'ttd' => $sekretaris->ttd ? asset('storage/' . $sekretaris->ttd) : null,
            ];
            $addedGuruIds[] = $sekretaris->id;
            $rekap['hadir']++;
        }

        // Add remaining peserta (skip duplicates of pimpinan/sekretaris)
        foreach ($pesertaRaw as $p) {
            $guruId = $p['guru_id'] ?? null;

            // Skip if already added as pimpinan/sekretaris
            if ($guruId && in_array($guruId, $addedGuruIds)) {
                continue;
            }

            $statusRaw = strtoupper(trim($p['status'] ?? 'A'));
            $statusKey = $statusMap[$statusRaw] ?? 'alpha';
            $guru = $guruId ? Guru::find($guruId) : null;

            // Skip "Semua Guru" entries
            if ($guru && str_contains(strtolower($guru->nama), 'semua guru')) {
                continue;
            }

            $peserta[] = [
                'nama' => $guru?->nama ?? ($p['nama'] ?? '-'),
                'jabatan' => $getJabatan($guru),
                'status' => ucfirst($statusKey),
                'status_class' => PrintService::getStatusClass($statusKey),
                'keterangan' => $p['keterangan'] ?? null,
                'ttd' => ($guru && $guru->ttd) ? asset('storage/' . $guru->ttd) : null,
            ];

            if ($guruId) {
                $addedGuruIds[] = $guruId;
            }
            $rekap[$statusKey]++;
        }

        // Handle photos
        $fotos = [];
        $fotoRapat = $absensi->foto_rapat ?? [];
        foreach ($fotoRapat as $foto) {
            if (strpos($foto, 'data:image') === 0) {
                $fotos[] = $foto;
            } else {
                $fotos[] = asset('storage/' . $foto);
            }
        }

        // Generate QR code verification for Pimpinan
        $qrData = PrintService::createVerification(
            'Berita Acara Rapat',
            $rapat->agenda_rapat ?? 'Rapat',
            $absensi->tanggal,
            ['tempat' => $rapat->tempat ?? '-', 'pimpinan' => $rapat->pimpinanGuru->nama ?? '-']
        );

        // Generate QR code verification for Sekretaris
        $qrSekretaris = null;
        if ($rapat->sekretarisGuru) {
            $qrSekretarisData = PrintService::createVerification(
                'Berita Acara Rapat',
                $rapat->agenda_rapat ?? 'Rapat',
                $absensi->tanggal,
                ['tempat' => $rapat->tempat ?? '-', 'sekretaris' => $rapat->sekretarisGuru->nama ?? '-']
            );
            $qrSekretaris = $qrSekretarisData['qrCode'];
        }

        return view('print.hasil-rapat', [
            'kopUrl' => PrintService::getKopUrl(),
            'rapat' => $rapat,
            'tanggalRapat' => PrintService::formatDate($absensi->tanggal),
            'waktuMulai' => PrintService::formatTime($rapat->waktu_mulai),
            'waktuSelesai' => PrintService::formatTime($rapat->waktu_selesai),
            'peserta' => $peserta,
            'rekap' => $rekap,
            'notulensi' => $absensi->notulensi,
            'fotos' => $fotos,
            'tanggalCetak' => PrintService::formatDate(now()),
            'qrCode' => $qrData['qrCode'],
            'qrSekretaris' => $qrSekretaris,
        ]);
    }

    /**
     * Print Hasil Rapat Bulk (Multiple Meeting Reports in 1 PDF)
     */
    public function hasilRapatBulk(Request $request)
    {
        $ids = $request->input('ids', []);

        if (empty($ids)) {
            return response()->json(['message' => 'Tidak ada rapat yang dipilih'], 400);
        }

        $statusMap = [
            'H' => 'hadir',
            'HADIR' => 'hadir',
            'I' => 'izin',
            'IZIN' => 'izin',
            'S' => 'sakit',
            'SAKIT' => 'sakit',
            'A' => 'alpha',
            'ALPHA' => 'alpha',
        ];

        $rapatList = [];

        // Helper to get jabatan from User role
        $getJabatan = function ($guru) {
            if (!$guru)
                return '-';
            $user = \App\Models\User::where('guru_id', $guru->id)->with('roles')->first();
            if ($user && $user->roles->count() > 0) {
                return ucwords(str_replace('_', ' ', $user->roles->first()->name ?? ''));
            }
            return $guru->jabatan ?? '-';
        };

        foreach ($ids as $absensiId) {
            $absensi = AbsensiRapat::with(['rapat.pimpinanGuru', 'rapat.sekretarisGuru'])
                ->find($absensiId);

            if (!$absensi)
                continue;

            $rapat = $absensi->rapat;

            // Parse peserta attendance
            $pesertaRaw = $absensi->absensi_peserta ?? [];
            $peserta = [];
            $rekap = ['hadir' => 0, 'izin' => 0, 'sakit' => 0, 'alpha' => 0];
            $addedGuruIds = [];

            // Auto-include Pimpinan as Hadir (first in list)
            if ($rapat->pimpinanGuru) {
                $pimpinan = $rapat->pimpinanGuru;
                $peserta[] = [
                    'nama' => $pimpinan->nama,
                    'jabatan' => $getJabatan($pimpinan),
                    'status' => 'Hadir',
                    'status_class' => PrintService::getStatusClass('hadir'),
                    'keterangan' => null,
                    'ttd' => $pimpinan->ttd ? asset('storage/' . $pimpinan->ttd) : null,
                ];
                $addedGuruIds[] = $pimpinan->id;
                $rekap['hadir']++;
            }

            // Auto-include Sekretaris as Hadir (second in list)
            if ($rapat->sekretarisGuru && !in_array($rapat->sekretarisGuru->id, $addedGuruIds)) {
                $sekretaris = $rapat->sekretarisGuru;
                $peserta[] = [
                    'nama' => $sekretaris->nama,
                    'jabatan' => $getJabatan($sekretaris),
                    'status' => 'Hadir',
                    'status_class' => PrintService::getStatusClass('hadir'),
                    'keterangan' => null,
                    'ttd' => $sekretaris->ttd ? asset('storage/' . $sekretaris->ttd) : null,
                ];
                $addedGuruIds[] = $sekretaris->id;
                $rekap['hadir']++;
            }

            // Add remaining peserta (skip duplicates of pimpinan/sekretaris)
            foreach ($pesertaRaw as $p) {
                $guruId = $p['guru_id'] ?? null;

                // Skip if already added as pimpinan/sekretaris
                if ($guruId && in_array($guruId, $addedGuruIds)) {
                    continue;
                }

                $statusRaw = strtoupper(trim($p['status'] ?? 'A'));
                $statusKey = $statusMap[$statusRaw] ?? 'alpha';
                $guru = $guruId ? Guru::find($guruId) : null;

                // Skip "Semua Guru" entries
                if ($guru && str_contains(strtolower($guru->nama), 'semua guru')) {
                    continue;
                }

                $peserta[] = [
                    'nama' => $guru?->nama ?? ($p['nama'] ?? '-'),
                    'jabatan' => $getJabatan($guru),
                    'status' => ucfirst($statusKey),
                    'status_class' => PrintService::getStatusClass($statusKey),
                    'keterangan' => $p['keterangan'] ?? null,
                    'ttd' => ($guru && $guru->ttd) ? asset('storage/' . $guru->ttd) : null,
                ];

                if ($guruId) {
                    $addedGuruIds[] = $guruId;
                }
                $rekap[$statusKey]++;
            }

            // Handle photos
            $fotos = [];
            $fotoRapat = $absensi->foto_rapat ?? [];
            foreach ($fotoRapat as $foto) {
                if (strpos($foto, 'data:image') === 0) {
                    $fotos[] = $foto;
                } else {
                    $fotos[] = asset('storage/' . $foto);
                }
            }

            // Generate QR code verification for Pimpinan
            $qrData = PrintService::createVerification(
                'Berita Acara Rapat',
                $rapat->agenda_rapat ?? 'Rapat',
                $absensi->tanggal,
                ['tempat' => $rapat->tempat ?? '-', 'pimpinan' => $rapat->pimpinanGuru->nama ?? '-']
            );

            // Generate QR code verification for Sekretaris
            $qrSekretaris = null;
            if ($rapat->sekretarisGuru) {
                $qrSekretarisData = PrintService::createVerification(
                    'Berita Acara Rapat',
                    $rapat->agenda_rapat ?? 'Rapat',
                    $absensi->tanggal,
                    ['tempat' => $rapat->tempat ?? '-', 'sekretaris' => $rapat->sekretarisGuru->nama ?? '-']
                );
                $qrSekretaris = $qrSekretarisData['qrCode'];
            }

            $rapatList[] = [
                'rapat' => $rapat,
                'tanggalRapat' => PrintService::formatDate($absensi->tanggal),
                'waktuMulai' => PrintService::formatTime($rapat->waktu_mulai),
                'waktuSelesai' => PrintService::formatTime($rapat->waktu_selesai),
                'peserta' => $peserta,
                'rekap' => $rekap,
                'notulensi' => $absensi->notulensi,
                'fotos' => $fotos,
                'qrCode' => $qrData['qrCode'],
                'qrSekretaris' => $qrSekretaris,
            ];
        }

        return view('print.hasil-rapat-bulk', [
            'kopUrl' => PrintService::getKopUrl(),
            'rapatList' => $rapatList,
            'tanggalCetak' => PrintService::formatDate(now()),
        ]);
    }

    /**
     * Print Hasil Kegiatan (Single Activity Report)
     */
    public function hasilKegiatan(Request $request, $absensiId)
    {
        $absensi = AbsensiKegiatan::with(['kegiatan.penanggungJawab'])
            ->find($absensiId);

        if (!$absensi) {
            return response()->json(['message' => 'Data absensi kegiatan tidak ditemukan'], 404);
        }

        $kegiatan = $absensi->kegiatan;

        // Parse pendamping attendance
        $pendampingRaw = $absensi->absensi_pendamping ?? [];
        $pendamping = [];
        $rekapPendamping = ['hadir' => 0, 'izin' => 0, 'sakit' => 0, 'alpha' => 0];
        $addedGuruIds = [];

        // Map for status conversion
        $statusMap = [
            'H' => 'hadir',
            'HADIR' => 'hadir',
            'I' => 'izin',
            'IZIN' => 'izin',
            'S' => 'sakit',
            'SAKIT' => 'sakit',
            'A' => 'alpha',
            'ALPHA' => 'alpha',
        ];

        // Helper to get jabatan from User role
        $getJabatan = function ($guru) {
            if (!$guru)
                return '-';
            $user = \App\Models\User::where('guru_id', $guru->id)->with('roles')->first();
            if ($user && $user->roles->count() > 0) {
                return ucwords(str_replace('_', ' ', $user->roles->first()->name ?? ''));
            }
            return $guru->jabatan ?? 'Guru';
        };

        // Auto-include PJ/Koordinator as first in the attendance list
        if ($kegiatan->penanggungJawab) {
            $pj = $kegiatan->penanggungJawab;
            $pjStatusRaw = strtoupper(trim($absensi->pj_status ?? 'H'));
            $pjStatusKey = $statusMap[$pjStatusRaw] ?? 'hadir';
            $pendamping[] = [
                'nama' => $pj->nama,
                'jabatan' => $getJabatan($pj) . ' (Koordinator)',
                'status' => strtoupper($pjStatusRaw),
                'status_class' => PrintService::getStatusClass($pjStatusKey),
                'keterangan' => $absensi->pj_keterangan ?? null,
            ];
            $addedGuruIds[] = $pj->id;
            $rekapPendamping[$pjStatusKey]++;
        }

        foreach ($pendampingRaw as $p) {
            $guruId = $p['guru_id'] ?? null;

            // Skip if already added as PJ
            if ($guruId && in_array($guruId, $addedGuruIds)) {
                continue;
            }

            $statusRaw = strtoupper(trim($p['status'] ?? 'A'));
            $statusKey = $statusMap[$statusRaw] ?? 'alpha';
            $guru = Guru::find($guruId);

            // Skip "Semua Guru" entries
            if ($guru && str_contains(strtolower($guru->nama), 'semua guru')) {
                continue;
            }

            $pendamping[] = [
                'nama' => $guru?->nama ?? ($p['nama'] ?? '-'),
                'jabatan' => $getJabatan($guru),
                'status' => strtoupper($statusRaw),
                'status_class' => PrintService::getStatusClass($statusKey),
                'keterangan' => $p['keterangan'] ?? null,
            ];

            if ($guruId) {
                $addedGuruIds[] = $guruId;
            }
            $rekapPendamping[$statusKey]++;
        }

        // Parse siswa attendance
        $siswaRaw = $absensi->absensi_siswa ?? [];
        $siswa = [];
        $rekapSiswa = ['hadir' => 0, 'izin' => 0, 'sakit' => 0, 'alpha' => 0];

        foreach ($siswaRaw as $s) {
            $statusRaw = strtoupper(trim($s['status'] ?? 'A'));
            $statusKey = $statusMap[$statusRaw] ?? 'alpha';
            $siswaModel = \App\Models\Siswa::with('kelas')->find($s['siswa_id'] ?? null);

            $siswa[] = [
                'nama' => $siswaModel?->nama ?? ($s['nama'] ?? '-'),
                'kelas' => $siswaModel?->kelas?->nama_kelas ?? ($s['kelas'] ?? '-'),
                'kelas_order' => $siswaModel?->kelas?->nama_kelas ?? 'ZZZ',
                'status' => strtoupper($statusRaw),
                'status_class' => PrintService::getStatusClass($statusKey),
                'keterangan' => $s['keterangan'] ?? null,
            ];

            $rekapSiswa[$statusKey]++;
        }

        // Sort siswa by kelas (lowest first)
        usort($siswa, function ($a, $b) {
            return strnatcasecmp($a['kelas_order'], $b['kelas_order']);
        });

        // Handle photos
        $fotos = [];
        $fotoKegiatan = $absensi->foto_kegiatan ?? [];
        foreach ($fotoKegiatan as $foto) {
            if (strpos($foto, 'data:image') === 0) {
                $fotos[] = $foto;
            } else {
                $fotos[] = asset('storage/' . $foto);
            }
        }

        // Parse waktu properly from kegiatan datetime
        $waktuMulai = '-';
        $waktuSelesai = '-';
        if ($kegiatan->waktu_mulai) {
            try {
                $waktuMulai = \Carbon\Carbon::parse($kegiatan->waktu_mulai)->format('H:i');
            } catch (\Exception $e) {
                $waktuMulai = '-';
            }
        }
        if ($kegiatan->waktu_berakhir) {
            try {
                $waktuSelesai = \Carbon\Carbon::parse($kegiatan->waktu_berakhir)->format('H:i');
            } catch (\Exception $e) {
                $waktuSelesai = '-';
            }
        }

        // Generate QR code verification for Kepala Madrasah
        $qrData = PrintService::createVerification(
            'Laporan Kegiatan',
            $kegiatan->nama_kegiatan ?? 'Kegiatan',
            $absensi->tanggal,
            ['tempat' => $kegiatan->tempat ?? '-', 'penanggung_jawab' => $kegiatan->penanggungJawab->nama ?? '-']
        );

        // Generate QR code verification for Penanggung Jawab
        $qrPJ = null;
        if ($kegiatan->penanggungJawab) {
            $qrPJData = PrintService::createVerification(
                'Laporan Kegiatan',
                $kegiatan->nama_kegiatan ?? 'Kegiatan',
                $absensi->tanggal,
                ['tempat' => $kegiatan->tempat ?? '-', 'koordinator' => $kegiatan->penanggungJawab->nama ?? '-']
            );
            $qrPJ = $qrPJData['qrCode'];
        }

        return view('print.hasil-kegiatan', [
            'kopUrl' => PrintService::getKopUrl(),
            'kegiatan' => $kegiatan,
            'tanggalKegiatan' => PrintService::formatDate($absensi->tanggal),
            'waktuMulai' => $waktuMulai,
            'waktuSelesai' => $waktuSelesai,
            'pendamping' => $pendamping,
            'rekapPendamping' => $rekapPendamping,
            'siswa' => $siswa,
            'rekapSiswa' => $rekapSiswa,
            'beritaAcara' => $absensi->berita_acara,
            'fotos' => $fotos,
            'tanggalCetak' => PrintService::formatDate(now()),
            'kepalaSekolah' => PrintService::getKepalaSekolah(),
            'qrCode' => $qrData['qrCode'],
            'qrPJ' => $qrPJ,
        ]);
    }

    /**
     * Print Hasil Kegiatan Bulk (Multiple Activity Reports in 1 PDF)
     */
    public function hasilKegiatanBulk(Request $request)
    {
        $ids = $request->input('ids', []);

        if (empty($ids)) {
            return response()->json(['message' => 'Tidak ada kegiatan yang dipilih'], 400);
        }

        $kegiatanList = [];
        $statusMap = [
            'H' => 'hadir',
            'HADIR' => 'hadir',
            'I' => 'izin',
            'IZIN' => 'izin',
            'S' => 'sakit',
            'SAKIT' => 'sakit',
            'A' => 'alpha',
            'ALPHA' => 'alpha',
        ];

        foreach ($ids as $absensiId) {
            $absensi = AbsensiKegiatan::with(['kegiatan.penanggungJawab'])->find($absensiId);

            if (!$absensi)
                continue;

            $kegiatan = $absensi->kegiatan;

            // Parse pendamping attendance
            $pendampingRaw = $absensi->absensi_pendamping ?? [];
            $pendamping = [];
            $rekapPendamping = ['hadir' => 0, 'izin' => 0, 'sakit' => 0, 'alpha' => 0];
            $addedGuruIds = [];

            // Helper to get jabatan from User role
            $getJabatan = function ($guru) {
                if (!$guru)
                    return '-';
                $user = \App\Models\User::where('guru_id', $guru->id)->with('roles')->first();
                if ($user && $user->roles->count() > 0) {
                    return ucwords(str_replace('_', ' ', $user->roles->first()->name ?? ''));
                }
                return $guru->jabatan ?? 'Guru';
            };

            // Auto-include PJ/Koordinator as first in the attendance list
            if ($kegiatan->penanggungJawab) {
                $pj = $kegiatan->penanggungJawab;
                $pjStatusRaw = strtoupper(trim($absensi->pj_status ?? 'H'));
                $pjStatusKey = $statusMap[$pjStatusRaw] ?? 'hadir';
                $pendamping[] = [
                    'nama' => $pj->nama,
                    'jabatan' => $getJabatan($pj) . ' (Koordinator)',
                    'status' => strtoupper($pjStatusRaw),
                    'status_class' => PrintService::getStatusClass($pjStatusKey),
                    'keterangan' => $absensi->pj_keterangan ?? null,
                ];
                $addedGuruIds[] = $pj->id;
                $rekapPendamping[$pjStatusKey]++;
            }

            foreach ($pendampingRaw as $p) {
                $guruId = $p['guru_id'] ?? null;

                // Skip if already added as PJ
                if ($guruId && in_array($guruId, $addedGuruIds)) {
                    continue;
                }

                $statusRaw = strtoupper(trim($p['status'] ?? 'A'));
                $statusKey = $statusMap[$statusRaw] ?? 'alpha';
                $guru = Guru::find($guruId);

                // Skip "Semua Guru" entries
                if ($guru && str_contains(strtolower($guru->nama), 'semua guru')) {
                    continue;
                }

                $pendamping[] = [
                    'nama' => $guru?->nama ?? ($p['nama'] ?? '-'),
                    'jabatan' => $getJabatan($guru),
                    'status' => strtoupper($statusRaw),
                    'status_class' => PrintService::getStatusClass($statusKey),
                    'keterangan' => $p['keterangan'] ?? null,
                ];

                if ($guruId) {
                    $addedGuruIds[] = $guruId;
                }
                $rekapPendamping[$statusKey]++;
            }

            // Parse siswa attendance
            $siswaRaw = $absensi->absensi_siswa ?? [];
            $siswa = [];
            $rekapSiswa = ['hadir' => 0, 'izin' => 0, 'sakit' => 0, 'alpha' => 0];

            foreach ($siswaRaw as $s) {
                $statusRaw = strtoupper(trim($s['status'] ?? 'A'));
                $statusKey = $statusMap[$statusRaw] ?? 'alpha';
                $siswaModel = \App\Models\Siswa::with('kelas')->find($s['siswa_id'] ?? null);

                $siswa[] = [
                    'nama' => $siswaModel?->nama ?? ($s['nama'] ?? '-'),
                    'kelas' => $siswaModel?->kelas?->nama_kelas ?? ($s['kelas'] ?? '-'),
                    'kelas_order' => $siswaModel?->kelas?->nama_kelas ?? 'ZZZ',
                    'status' => strtoupper($statusRaw),
                    'status_class' => PrintService::getStatusClass($statusKey),
                    'keterangan' => $s['keterangan'] ?? null,
                ];

                $rekapSiswa[$statusKey]++;
            }

            // Sort siswa by kelas (lowest first)
            usort($siswa, function ($a, $b) {
                return strnatcasecmp($a['kelas_order'], $b['kelas_order']);
            });

            // Handle photos
            $fotos = [];
            $fotoKegiatan = $absensi->foto_kegiatan ?? [];
            foreach ($fotoKegiatan as $foto) {
                if (strpos($foto, 'data:image') === 0) {
                    $fotos[] = $foto;
                } else {
                    $fotos[] = asset('storage/' . $foto);
                }
            }

            // Parse waktu
            $waktuMulai = '-';
            $waktuSelesai = '-';
            if ($kegiatan->waktu_mulai) {
                try {
                    $waktuMulai = \Carbon\Carbon::parse($kegiatan->waktu_mulai)->format('H:i');
                } catch (\Exception $e) {
                    $waktuMulai = '-';
                }
            }
            if ($kegiatan->waktu_berakhir) {
                try {
                    $waktuSelesai = \Carbon\Carbon::parse($kegiatan->waktu_berakhir)->format('H:i');
                } catch (\Exception $e) {
                    $waktuSelesai = '-';
                }
            }

            // Generate QR code verification for Kepala Madrasah
            $qrData = PrintService::createVerification(
                'Laporan Kegiatan',
                $kegiatan->nama_kegiatan ?? 'Kegiatan',
                $absensi->tanggal,
                ['tempat' => $kegiatan->tempat ?? '-', 'penanggung_jawab' => $kegiatan->penanggungJawab->nama ?? '-']
            );

            // Generate QR code verification for Penanggung Jawab
            $qrPJ = null;
            if ($kegiatan->penanggungJawab) {
                $qrPJData = PrintService::createVerification(
                    'Laporan Kegiatan',
                    $kegiatan->nama_kegiatan ?? 'Kegiatan',
                    $absensi->tanggal,
                    ['tempat' => $kegiatan->tempat ?? '-', 'koordinator' => $kegiatan->penanggungJawab->nama ?? '-']
                );
                $qrPJ = $qrPJData['qrCode'];
            }

            $kegiatanList[] = [
                'kegiatan' => $kegiatan,
                'tanggalKegiatan' => PrintService::formatDate($absensi->tanggal),
                'waktuMulai' => $waktuMulai,
                'waktuSelesai' => $waktuSelesai,
                'pendamping' => $pendamping,
                'rekapPendamping' => $rekapPendamping,
                'siswa' => $siswa,
                'rekapSiswa' => $rekapSiswa,
                'beritaAcara' => $absensi->berita_acara,
                'fotos' => $fotos,
                'qrCode' => $qrData['qrCode'],
                'qrPJ' => $qrPJ,
            ];
        }

        return view('print.hasil-kegiatan-bulk', [
            'kopUrl' => PrintService::getKopUrl(),
            'kegiatanList' => $kegiatanList,
            'tanggalCetak' => PrintService::formatDate(now()),
            'kepalaSekolah' => PrintService::getKepalaSekolah(),
        ]);
    }

    /**
     * Print Profil Guru
     */
    public function profilGuru(Request $request)
    {
        $user = $request->user();
        $guru = $user->guru;

        if (!$guru) {
            return response()->json(['message' => 'Data guru tidak ditemukan'], 404);
        }

        $fotoUrl = null;
        if ($guru->foto) {
            $fotoUrl = asset('storage/' . $guru->foto);
        }

        $qrData = PrintService::createVerification(
            'Data Guru',
            'Profil ' . $guru->nama,
            now()->toDateString()
        );

        return view('print.profil-guru', [
            'kopUrl' => PrintService::getKopUrl(),
            'guru' => $guru,
            'fotoUrl' => $fotoUrl,
            'tanggalLahir' => PrintService::formatDate($guru->tanggal_lahir),
            'tmt' => PrintService::formatDate($guru->tmt),
            'tanggalCetak' => PrintService::formatDate(now()),
            'qrCode' => $qrData['qrCode'],
        ]);
    }

    /**
     * Get list of classes taught by guru (for Jurnal Kelas selection)
     */
    public function getKelasList(Request $request)
    {
        $user = $request->user();
        $guru = $user->guru;
        $tahunAjaranId = $request->input('tahun_ajaran_id') ?? TahunAjaran::getActive()?->id;

        if (!$guru) {
            return response()->json(['kelas' => []]);
        }

        // Get unique classes from jadwal
        $kelasIds = Jadwal::where('guru_id', $guru->id)
            ->where('tahun_ajaran_id', $tahunAjaranId)
            ->where('status', 'Aktif')
            ->pluck('kelas_id')
            ->unique();

        $kelasList = Kelas::whereIn('id', $kelasIds)
            ->orderBy('nama_kelas')
            ->get(['id', 'nama_kelas']);

        return response()->json(['kelas' => $kelasList]);
    }

    /**
     * Print Daftar Hadir Peserta Didik (Student Attendance Sheet)
     * Generates a monthly attendance grid per class with ASIH priority logic.
     */
    public function daftarHadirKelas(Request $request, $kelasId)
    {
        $kelas = Kelas::with('waliKelas')->find($kelasId);

        if (!$kelas) {
            return response()->json(['message' => 'Kelas tidak ditemukan'], 404);
        }

        $bulan = (int) $request->input('bulan', now()->month); // 1-12
        $tahun = (int) $request->input('tahun', now()->year);
        $tahunAjaranId = $kelas->tahun_ajaran_id ?? TahunAjaran::getActive()?->id;

        // Get days in month
        $daysInMonth = Carbon::create($tahun, $bulan)->daysInMonth;

        // Date range for the month
        $startDate = Carbon::create($tahun, $bulan, 1)->startOfDay();
        $endDate = Carbon::create($tahun, $bulan, $daysInMonth)->endOfDay();

        // Get all siswa in this kelas for this tahun ajaran
        $siswaKelas = SiswaKelas::with('siswa')
            ->where('kelas_id', $kelasId)
            ->where('tahun_ajaran_id', $tahunAjaranId)
            ->whereIn('status', ['Aktif', 'Naik', 'Tinggal'])
            ->get();

        $siswaList = $siswaKelas->map(fn($sk) => $sk->siswa)->filter()->sortBy('nama')->values();

        // Get all jadwal IDs for this class
        $jadwalIds = Jadwal::where('kelas_id', $kelasId)
            ->where('tahun_ajaran_id', $tahunAjaranId)
            ->pluck('id');

        // Get distinct school days for this class in the month (from absensi_mengajar)
        $schoolDays = AbsensiMengajar::whereIn('jadwal_id', $jadwalIds)
            ->whereBetween('tanggal', [$startDate, $endDate])
            ->distinct()
            ->pluck('tanggal')
            ->map(fn($d) => Carbon::parse($d)->day)
            ->unique()
            ->toArray();

        // Get all AbsensiSiswa for this kelas in the month (per-day system)
        $absensiSiswaData = AbsensiSiswa::where('kelas_id', $kelasId)
            ->whereBetween('tanggal', [$startDate, $endDate])
            ->get();

        // Group by siswa_id -> day -> status
        $attendance = [];
        foreach ($absensiSiswaData as $record) {
            $siswaId = $record->siswa_id;
            $tgl = Carbon::parse($record->tanggal)->day;
            $attendance[$siswaId][$tgl] = strtoupper($record->status);
        }

        // Build attendance grid
        $rows = [];
        $no = 1;
        foreach ($siswaList as $siswa) {
            $row = [
                'no' => $no++,
                'nis' => $siswa->nis ?? '-',
                'nama' => $siswa->nama,
                'days' => [],
                'total_h' => 0,
                'total_s' => 0,
                'total_i' => 0,
                'total_a' => 0,
            ];

            for ($d = 1; $d <= $daysInMonth; $d++) {
                if (!in_array($d, $schoolDays)) {
                    // Not a school day - empty cell
                    $row['days'][$d] = '';
                } elseif (isset($attendance[$siswa->id][$d])) {
                    // Has a non-hadir record
                    $finalStatus = $attendance[$siswa->id][$d];
                    $row['days'][$d] = $finalStatus;
                    if ($finalStatus === 'S')
                        $row['total_s']++;
                    if ($finalStatus === 'I')
                        $row['total_i']++;
                    if ($finalStatus === 'A')
                        $row['total_a']++;
                } else {
                    // School day with no record = Hadir
                    $row['days'][$d] = 'H';
                    $row['total_h']++;
                }
            }

            $rows[] = $row;
        }

        // Month name in Indonesian
        $bulanNames = [
            1 => 'Januari',
            2 => 'Februari',
            3 => 'Maret',
            4 => 'April',
            5 => 'Mei',
            6 => 'Juni',
            7 => 'Juli',
            8 => 'Agustus',
            9 => 'September',
            10 => 'Oktober',
            11 => 'November',
            12 => 'Desember',
        ];
        $bulanNama = $bulanNames[$bulan] ?? '';

        $tahunAjaran = TahunAjaran::find($tahunAjaranId);

        // Generate QR code for Kepala Sekolah
        $qrData = PrintService::createVerification(
            'Daftar Hadir Peserta Didik',
            'Daftar Hadir Kelas ' . ($kelas->nama_kelas ?? '') . ' - ' . $bulanNama . ' ' . $tahun,
            now()->toDateString(),
            [
                'kelas' => $kelas->nama_kelas ?? '-',
                'bulan' => $bulanNama . ' ' . $tahun,
                'wali_kelas' => $kelas->waliKelas->nama ?? '-',
            ]
        );

        // Generate QR code for Wali Kelas
        $qrWaliKelas = PrintService::createVerification(
            'Daftar Hadir Peserta Didik - Wali Kelas',
            'Daftar Hadir Kelas ' . ($kelas->nama_kelas ?? '') . ' - ' . $bulanNama . ' ' . $tahun . ' (Wali Kelas: ' . ($kelas->waliKelas->nama ?? '-') . ')',
            now()->toDateString(),
            [
                'kelas' => $kelas->nama_kelas ?? '-',
                'bulan' => $bulanNama . ' ' . $tahun,
                'wali_kelas' => $kelas->waliKelas->nama ?? '-',
            ]
        );

        return view('print.daftar-hadir-kelas', [
            'kopUrl' => PrintService::getKopUrl(),
            'kelas' => $kelas,
            'rows' => $rows,
            'daysInMonth' => $daysInMonth,
            'bulanNama' => $bulanNama,
            'tahun' => $tahun,
            'tahunAjaran' => $tahunAjaran ? $tahunAjaran->nama : '-',
            'tanggalCetak' => PrintService::formatDate(now()),
            'kepalaSekolah' => PrintService::getKepalaSekolah(),
            'qrCode' => $qrData['qrCode'],
            'qrWaliKelas' => $qrWaliKelas['qrCode'],
        ]);
    }

    /**
     * Bulk Print Daftar Hadir Kelas - single page with multiple kelas × bulan
     * Accepts: kelas_ids (comma-separated), bulan (comma-separated 1-12), tahun
     */
    public function daftarHadirKelasBulk(Request $request)
    {
        $kelasIds = array_filter(explode(',', $request->input('kelas_ids', '')));
        $bulanValues = array_filter(array_map('intval', explode(',', $request->input('bulan', ''))));
        $tahun = (int) $request->input('tahun', now()->year);

        if (empty($kelasIds) || empty($bulanValues)) {
            return response()->json(['message' => 'kelas_ids dan bulan wajib diisi'], 400);
        }

        $sections = [];
        $bulanNames = [
            1 => 'Januari',
            2 => 'Februari',
            3 => 'Maret',
            4 => 'April',
            5 => 'Mei',
            6 => 'Juni',
            7 => 'Juli',
            8 => 'Agustus',
            9 => 'September',
            10 => 'Oktober',
            11 => 'November',
            12 => 'Desember'
        ];

        foreach ($kelasIds as $kelasId) {
            $kelas = Kelas::with('waliKelas')->find($kelasId);
            if (!$kelas)
                continue;

            $tahunAjaranId = $kelas->tahun_ajaran_id ?? TahunAjaran::getActive()?->id;

            foreach ($bulanValues as $bulan) {
                $daysInMonth = Carbon::create($tahun, $bulan)->daysInMonth;
                $startDate = Carbon::create($tahun, $bulan, 1)->startOfDay();
                $endDate = Carbon::create($tahun, $bulan, $daysInMonth)->endOfDay();

                $siswaKelas = SiswaKelas::with('siswa')
                    ->where('kelas_id', $kelasId)
                    ->where('tahun_ajaran_id', $tahunAjaranId)
                    ->whereIn('status', ['Aktif', 'Naik', 'Tinggal'])
                    ->get();
                $siswaList = $siswaKelas->map(fn($sk) => $sk->siswa)->filter()->sortBy('nama')->values();

                $jadwalIds = Jadwal::where('kelas_id', $kelasId)
                    ->where('tahun_ajaran_id', $tahunAjaranId)
                    ->pluck('id');

                $schoolDays = AbsensiMengajar::whereIn('jadwal_id', $jadwalIds)
                    ->whereBetween('tanggal', [$startDate, $endDate])
                    ->distinct()->pluck('tanggal')
                    ->map(fn($d) => Carbon::parse($d)->day)->unique()->toArray();

                $absensiSiswaData = AbsensiSiswa::where('kelas_id', $kelasId)
                    ->whereBetween('tanggal', [$startDate, $endDate])->get();

                $attendance = [];
                foreach ($absensiSiswaData as $record) {
                    $attendance[$record->siswa_id][Carbon::parse($record->tanggal)->day] = strtoupper($record->status);
                }

                $rows = [];
                $no = 1;
                foreach ($siswaList as $siswa) {
                    $row = [
                        'no' => $no++,
                        'nis' => $siswa->nis ?? '-',
                        'nama' => $siswa->nama,
                        'days' => [],
                        'total_h' => 0,
                        'total_s' => 0,
                        'total_i' => 0,
                        'total_a' => 0
                    ];
                    for ($d = 1; $d <= $daysInMonth; $d++) {
                        if (!in_array($d, $schoolDays)) {
                            $row['days'][$d] = '';
                        } elseif (isset($attendance[$siswa->id][$d])) {
                            $fs = $attendance[$siswa->id][$d];
                            $row['days'][$d] = $fs;
                            if ($fs === 'S')
                                $row['total_s']++;
                            if ($fs === 'I')
                                $row['total_i']++;
                            if ($fs === 'A')
                                $row['total_a']++;
                        } else {
                            $row['days'][$d] = 'H';
                            $row['total_h']++;
                        }
                    }
                    $rows[] = $row;
                }

                $bulanNama = $bulanNames[$bulan] ?? '';
                $tahunAjaran = TahunAjaran::find($tahunAjaranId);

                $qrData = PrintService::createVerification(
                    'Daftar Hadir Peserta Didik',
                    'Daftar Hadir Kelas ' . ($kelas->nama_kelas ?? '') . ' - ' . $bulanNama . ' ' . $tahun,
                    now()->toDateString(),
                    ['kelas' => $kelas->nama_kelas ?? '-', 'bulan' => $bulanNama . ' ' . $tahun, 'wali_kelas' => $kelas->waliKelas->nama ?? '-']
                );
                $qrWaliKelas = PrintService::createVerification(
                    'Daftar Hadir Peserta Didik - Wali Kelas',
                    'Daftar Hadir Kelas ' . ($kelas->nama_kelas ?? '') . ' - ' . $bulanNama . ' ' . $tahun . ' (Wali Kelas: ' . ($kelas->waliKelas->nama ?? '-') . ')',
                    now()->toDateString(),
                    ['kelas' => $kelas->nama_kelas ?? '-', 'bulan' => $bulanNama . ' ' . $tahun, 'wali_kelas' => $kelas->waliKelas->nama ?? '-']
                );

                $sections[] = [
                    'kelas' => $kelas,
                    'rows' => $rows,
                    'daysInMonth' => $daysInMonth,
                    'bulanNama' => $bulanNama,
                    'tahun' => $tahun,
                    'tahunAjaran' => $tahunAjaran ? $tahunAjaran->nama : '-',
                    'qrCode' => $qrData['qrCode'],
                    'qrWaliKelas' => $qrWaliKelas['qrCode'],
                ];
            }
        }

        return view('print.daftar-hadir-kelas-bulk', [
            'kopUrl' => PrintService::getKopUrl(),
            'sections' => $sections,
            'tanggalCetak' => PrintService::formatDate(now()),
            'kepalaSekolah' => PrintService::getKepalaSekolah(),
        ]);
    }

    /**
     * Bulk Print Jurnal Guru - single page with multiple guru × bulan
     * Accepts: guru_ids (comma-separated), bulan (comma-separated YYYY-MM), tahun
     */
    public function jurnalGuruBulk(Request $request)
    {
        $guruIds = array_filter(explode(',', $request->input('guru_ids', '')));
        $bulanValues = array_filter(array_map('intval', explode(',', $request->input('bulan', ''))));
        $tahun = (int) $request->input('tahun', now()->year);
        $tahunAjaranId = $request->input('tahun_ajaran_id') ?? TahunAjaran::getActive()?->id;

        if (empty($guruIds) || empty($bulanValues)) {
            return response()->json(['message' => 'guru_ids dan bulan wajib diisi'], 400);
        }

        $hariIndonesia = [
            'Sunday' => 'Minggu',
            'Monday' => 'Senin',
            'Tuesday' => 'Selasa',
            'Wednesday' => 'Rabu',
            'Thursday' => 'Kamis',
            'Friday' => 'Jumat',
            'Saturday' => 'Sabtu',
        ];

        $sections = [];

        foreach ($guruIds as $guruId) {
            $guru = Guru::find($guruId);
            if (!$guru)
                continue;

            foreach ($bulanValues as $bulan) {
                $bulanStr = $tahun . '-' . str_pad($bulan, 2, '0', STR_PAD_LEFT);

                $query = AbsensiMengajar::with(['jadwal.mapel', 'jadwal.kelas', 'jadwal.jamPelajaran', 'jadwal.jamPelajaranSampai'])
                    ->whereHas('jadwal', function ($q) use ($guru, $tahunAjaranId) {
                        $q->where('guru_id', $guru->id);
                        if ($tahunAjaranId)
                            $q->where('tahun_ajaran_id', $tahunAjaranId);
                    })
                    ->where('tanggal', 'like', $bulanStr . '%')
                    ->orderBy('tanggal', 'asc');

                $absensiData = $query->get();

                $data = [];
                $rekap = ['total' => 0, 'hadir' => 0, 'izin' => 0, 'sakit' => 0, 'alpha' => 0];

                foreach ($absensiData as $absensi) {
                    $jadwal = $absensi->jadwal;
                    $status = strtolower($absensi->guru_status ?? $absensi->status);
                    $tanggalCarbon = Carbon::parse($absensi->tanggal);

                    $siswaHadir = $absensi->siswa_hadir ?? 0;
                    $siswaSakit = $absensi->siswa_sakit ?? 0;
                    $siswaIzin = $absensi->siswa_izin ?? 0;
                    $siswaAlpha = $absensi->siswa_alpha ?? 0;

                    $jamKeStart = $jadwal->jamPelajaran->jam_ke ?? $jadwal->jam_ke ?? null;
                    $jamKeEnd = $jadwal->jamPelajaranSampai->jam_ke ?? null;
                    $jamKe = ($jamKeStart && $jamKeEnd && $jamKeStart != $jamKeEnd)
                        ? $jamKeStart . '-' . $jamKeEnd
                        : ($jamKeStart ?: '-');

                    $data[] = [
                        'tanggal' => PrintService::formatDate($absensi->tanggal),
                        'tanggal_short' => $tanggalCarbon->format('d/m/Y'),
                        'hari' => $absensi->snapshot_hari ?? ($hariIndonesia[$tanggalCarbon->format('l')] ?? $tanggalCarbon->format('l')),
                        'jam' => PrintService::formatTime($jadwal->jam_mulai ?? null),
                        'jam_ke' => $jamKe,
                        'kelas' => $absensi->snapshot_kelas ?? $jadwal->kelas->nama_kelas ?? '-',
                        'mapel' => $absensi->snapshot_mapel ?? $jadwal->mapel->nama_mapel ?? '-',
                        'materi' => $absensi->ringkasan_materi ?? '-',
                        'berita_acara' => $absensi->berita_acara ?? '-',
                        'siswa_hadir' => $siswaHadir,
                        'siswa_sakit' => $siswaSakit,
                        'siswa_izin' => $siswaIzin,
                        'siswa_alpha' => $siswaAlpha,
                        'status' => ucfirst($status),
                        'status_class' => PrintService::getStatusClass($status),
                    ];

                    $rekap['total']++;
                    $statusUpper = strtoupper(trim($absensi->guru_status ?? $absensi->status ?? 'H'));
                    $statusMap = ['H' => 'hadir', 'HADIR' => 'hadir', 'I' => 'izin', 'IZIN' => 'izin', 'S' => 'sakit', 'SAKIT' => 'sakit', 'A' => 'alpha', 'ALPHA' => 'alpha'];
                    $rekapKey = $statusMap[$statusUpper] ?? 'hadir';
                    $rekap[$rekapKey]++;
                }

                $bulanNames = [
                    1 => 'Januari',
                    2 => 'Februari',
                    3 => 'Maret',
                    4 => 'April',
                    5 => 'Mei',
                    6 => 'Juni',
                    7 => 'Juli',
                    8 => 'Agustus',
                    9 => 'September',
                    10 => 'Oktober',
                    11 => 'November',
                    12 => 'Desember'
                ];

                $sections[] = [
                    'guru' => $guru,
                    'data' => $data,
                    'rekap' => $rekap,
                    'bulanNama' => ($bulanNames[$bulan] ?? '') . ' ' . $tahun,
                ];
            }
        }

        $qrData = PrintService::createVerification(
            'Jurnal Mengajar Guru',
            'Jurnal Mengajar Guru',
            now()->toDateString()
        );

        return view('print.jurnal-guru-bulk', [
            'kopUrl' => PrintService::getKopUrl(),
            'sections' => $sections,
            'tanggalCetak' => PrintService::formatDate(now()),
            'kepalaSekolah' => PrintService::getKepalaSekolah(),
            'qrCode' => $qrData['qrCode'],
        ]);
    }

    /**
     * Bulk Print Daftar Hadir Guru - attendance grid like siswa
     * Merges: absensi_mengajar (guru_status), absensi_rapat, absensi_kegiatan
     * Also checks jadwal, rapat.peserta_rapat, kegiatan.guru_pendamping for
     * scheduled obligations — if no attendance record, marks as Alpha.
     */
    public function daftarHadirGuruBulk(Request $request)
    {
        $bulanValues = array_filter(array_map('intval', explode(',', $request->input('bulan', ''))));
        $tahun = (int) $request->input('tahun', now()->year);
        $tahunAjaranId = $request->input('tahun_ajaran_id') ?? TahunAjaran::getActive()?->id;

        if (empty($bulanValues)) {
            return response()->json(['message' => 'bulan wajib diisi'], 400);
        }

        $statusPriority = ['A' => 4, 'S' => 3, 'I' => 2, 'H' => 1];
        $bulanNames = [
            1 => 'Januari',
            2 => 'Februari',
            3 => 'Maret',
            4 => 'April',
            5 => 'Mei',
            6 => 'Juni',
            7 => 'Juli',
            8 => 'Agustus',
            9 => 'September',
            10 => 'Oktober',
            11 => 'November',
            12 => 'Desember'
        ];

        // Day-of-week map: Carbon dayOfWeek => Indonesian hari name
        $dayOfWeekMap = [
            0 => 'Minggu',
            1 => 'Senin',
            2 => 'Selasa',
            3 => 'Rabu',
            4 => 'Kamis',
            5 => 'Jumat',
            6 => 'Sabtu',
        ];

        // Get all active guru (exclude placeholder entries like 'Semua Guru')
        $guruList = Guru::where('status', 'Aktif')
            ->where('nama', '!=', 'Semua Guru')
            ->where(function ($q) {
                $q->whereNull('nip')
                    ->orWhere('nip', '!=', 'ALL');
            })
            ->orderBy('nama')
            ->get();

        // Pre-load all jadwal grouped by guru_id -> [hari1, hari2, ...]
        $jadwalByGuru = [];
        $jadwalAll = Jadwal::where('tahun_ajaran_id', $tahunAjaranId)->get();
        foreach ($jadwalAll as $j) {
            $jadwalByGuru[$j->guru_id][] = $j->hari;
        }
        // Unique days per guru
        foreach ($jadwalByGuru as $gId => $days) {
            $jadwalByGuru[$gId] = array_unique($days);
        }

        $sections = [];

        foreach ($bulanValues as $bulan) {
            $daysInMonth = Carbon::create($tahun, $bulan)->daysInMonth;
            $startDate = Carbon::create($tahun, $bulan, 1)->startOfDay();
            $endDate = Carbon::create($tahun, $bulan, $daysInMonth)->endOfDay();

            // guruAttendance[guru_id][day] = status from actual records
            $guruAttendance = [];
            // guruObligation[guru_id][day] = true (guru HAS an obligation that day)
            $guruObligation = [];

            // ═══ Pre-step: Collect Libur KBM days from Kalender ═══
            $liburDays = [];
            $kalenderLibur = \App\Models\Kalender::where('tahun_ajaran_id', $tahunAjaranId)
                ->where('status_kbm', 'Libur')
                ->get();
            foreach ($kalenderLibur as $kl) {
                $klStart = Carbon::parse($kl->tanggal_mulai)->startOfDay()->max($startDate);
                $klEnd = Carbon::parse($kl->tanggal_berakhir)->startOfDay()->min($endDate);
                while ($klStart->lte($klEnd)) {
                    $liburDays[] = $klStart->day;
                    $klStart->addDay();
                }
            }
            $liburDays = array_unique($liburDays);

            // ═══ Step 1: Detect obligations from jadwal (day-of-week schedule) ═══
            for ($d = 1; $d <= $daysInMonth; $d++) {
                $date = Carbon::create($tahun, $bulan, $d);
                $hariName = $dayOfWeekMap[$date->dayOfWeek] ?? '';
                foreach ($guruList as $guru) {
                    if (isset($jadwalByGuru[$guru->id]) && in_array($hariName, $jadwalByGuru[$guru->id])) {
                        // Skip jadwal obligation on Libur KBM days
                        if (!in_array($d, $liburDays)) {
                            $guruObligation[$guru->id][$d] = true;
                        }
                    }
                }
            }

            // ═══ Step 2: Detect obligations from rapat.peserta_rapat ═══
            $rapatList = Rapat::where('tahun_ajaran_id', $tahunAjaranId)
                ->whereNotNull('tanggal')
                ->whereBetween('tanggal', [$startDate, $endDate])
                ->get();

            foreach ($rapatList as $rapat) {
                $day = Carbon::parse($rapat->tanggal)->day;
                // Pimpinan
                if ($rapat->pimpinan_id) {
                    $guruObligation[$rapat->pimpinan_id][$day] = true;
                }
                // Sekretaris
                if ($rapat->sekretaris_id) {
                    $guruObligation[$rapat->sekretaris_id][$day] = true;
                }
                // Peserta
                $pesertaIds = $rapat->peserta_rapat ?? [];
                foreach ($pesertaIds as $pId) {
                    if (is_numeric($pId)) {
                        $guruObligation[(int) $pId][$day] = true;
                    }
                }
            }

            // ═══ Step 3: Detect obligations from kegiatan.guru_pendamping ═══
            $kegiatanList = Kegiatan::where('tahun_ajaran_id', $tahunAjaranId)
                ->whereNotNull('waktu_mulai')
                ->get();

            foreach ($kegiatanList as $kegiatan) {
                $kStart = Carbon::parse($kegiatan->waktu_mulai);
                $kEnd = $kegiatan->waktu_berakhir ? Carbon::parse($kegiatan->waktu_berakhir) : $kStart;
                // Check if kegiatan overlaps with this month
                if ($kEnd->lt($startDate) || $kStart->gt($endDate))
                    continue;

                $guruIds = [];
                if ($kegiatan->penanggung_jawab_id) {
                    $guruIds[] = $kegiatan->penanggung_jawab_id;
                }
                foreach ($kegiatan->guru_pendamping ?? [] as $gpId) {
                    if (is_numeric($gpId))
                        $guruIds[] = (int) $gpId;
                }

                // Mark each day of the kegiatan within this month
                $iterDate = $kStart->copy()->max($startDate);
                $iterEnd = $kEnd->copy()->min($endDate);
                while ($iterDate->lte($iterEnd)) {
                    $day = $iterDate->day;
                    foreach ($guruIds as $gId) {
                        $guruObligation[$gId][$day] = true;
                    }
                    $iterDate->addDay();
                }
            }

            // ═══ Step 4: Collect actual attendance records ═══

            // 4a. AbsensiMengajar
            $mengajarData = AbsensiMengajar::with('jadwal')
                ->whereBetween('tanggal', [$startDate, $endDate])
                ->get();

            foreach ($mengajarData as $record) {
                $guruId = $record->guru_id ?? $record->jadwal?->guru_id;
                if (!$guruId)
                    continue;
                $day = Carbon::parse($record->tanggal)->day;
                // Skip mengajar records on Libur KBM days
                if (in_array($day, $liburDays))
                    continue;
                $guruObligation[$guruId][$day] = true; // also mark as obligation
                $status = strtoupper($record->guru_status ?? 'H');
                if (!in_array($status, ['H', 'S', 'I', 'A']))
                    $status = 'H';
                $existing = $guruAttendance[$guruId][$day] ?? null;
                if (!$existing || ($statusPriority[$status] ?? 0) > ($statusPriority[$existing] ?? 0)) {
                    $guruAttendance[$guruId][$day] = $status;
                }
            }

            // 4b. AbsensiRapat
            $rapatData = AbsensiRapat::with('rapat')
                ->whereBetween('tanggal', [$startDate, $endDate])
                ->get();

            foreach ($rapatData as $record) {
                $day = Carbon::parse($record->tanggal)->day;

                // Pimpinan
                if ($record->rapat && $record->rapat->pimpinan_id) {
                    $pGuruId = $record->rapat->pimpinan_id;
                    $pStatus = strtoupper($record->pimpinan_status ?? 'H');
                    if (!in_array($pStatus, ['H', 'S', 'I', 'A']))
                        $pStatus = 'H';
                    $existing = $guruAttendance[$pGuruId][$day] ?? null;
                    if (!$existing || ($statusPriority[$pStatus] ?? 0) > ($statusPriority[$existing] ?? 0)) {
                        $guruAttendance[$pGuruId][$day] = $pStatus;
                    }
                }

                // Peserta
                foreach ($record->absensi_peserta ?? [] as $p) {
                    $pGuruId = $p['guru_id'] ?? null;
                    if (!$pGuruId)
                        continue;
                    $pStatus = strtoupper($p['status'] ?? 'H');
                    if (!in_array($pStatus, ['H', 'S', 'I', 'A']))
                        $pStatus = 'H';
                    $existing = $guruAttendance[$pGuruId][$day] ?? null;
                    if (!$existing || ($statusPriority[$pStatus] ?? 0) > ($statusPriority[$existing] ?? 0)) {
                        $guruAttendance[$pGuruId][$day] = $pStatus;
                    }
                }
            }

            // 4c. AbsensiKegiatan
            $kegiatanData = AbsensiKegiatan::with('kegiatan')
                ->whereBetween('tanggal', [$startDate, $endDate])
                ->get();

            foreach ($kegiatanData as $record) {
                $day = Carbon::parse($record->tanggal)->day;

                // PJ
                if ($record->penanggung_jawab_id) {
                    $pjGuruId = $record->penanggung_jawab_id;
                    $pjStatus = strtoupper($record->pj_status ?? 'H');
                    if (!in_array($pjStatus, ['H', 'S', 'I', 'A']))
                        $pjStatus = 'H';
                    $existing = $guruAttendance[$pjGuruId][$day] ?? null;
                    if (!$existing || ($statusPriority[$pjStatus] ?? 0) > ($statusPriority[$existing] ?? 0)) {
                        $guruAttendance[$pjGuruId][$day] = $pjStatus;
                    }
                }

                // Pendamping
                foreach ($record->absensi_pendamping ?? [] as $p) {
                    $pGuruId = $p['guru_id'] ?? null;
                    if (!$pGuruId)
                        continue;
                    $pStatus = strtoupper($p['status'] ?? 'H');
                    if (!in_array($pStatus, ['H', 'S', 'I', 'A']))
                        $pStatus = 'H';
                    $existing = $guruAttendance[$pGuruId][$day] ?? null;
                    if (!$existing || ($statusPriority[$pStatus] ?? 0) > ($statusPriority[$existing] ?? 0)) {
                        $guruAttendance[$pGuruId][$day] = $pStatus;
                    }
                }
            }

            // ═══ Step 5: Build rows — obligation without attendance = Alpha ═══
            $rows = [];
            $no = 1;
            foreach ($guruList as $guru) {
                $hasAnyObligation = isset($guruObligation[$guru->id]);
                if (!$hasAnyObligation)
                    continue;

                $row = [
                    'no' => $no++,
                    'nip' => $guru->nip ?? '-',
                    'nama' => $guru->nama,
                    'days' => [],
                    'total_h' => 0,
                    'total_s' => 0,
                    'total_i' => 0,
                    'total_a' => 0,
                ];

                for ($d = 1; $d <= $daysInMonth; $d++) {
                    $hasObligation = isset($guruObligation[$guru->id][$d]);
                    $hasRecord = isset($guruAttendance[$guru->id][$d]);

                    if (!$hasObligation) {
                        // No obligation = empty cell
                        $row['days'][$d] = '';
                    } elseif ($hasRecord) {
                        // Has attendance record
                        $st = $guruAttendance[$guru->id][$d];
                        $row['days'][$d] = $st;
                        if ($st === 'H')
                            $row['total_h']++;
                        if ($st === 'S')
                            $row['total_s']++;
                        if ($st === 'I')
                            $row['total_i']++;
                        if ($st === 'A')
                            $row['total_a']++;
                    } else {
                        // Has obligation but NO attendance record = Alpha
                        $row['days'][$d] = 'A';
                        $row['total_a']++;
                    }
                }
                $rows[] = $row;
            }

            $bulanNama = $bulanNames[$bulan] ?? '';
            $tahunAjaranObj = TahunAjaran::find($tahunAjaranId);

            $sections[] = [
                'rows' => $rows,
                'daysInMonth' => $daysInMonth,
                'bulanNama' => $bulanNama,
                'tahun' => $tahun,
                'tahunAjaran' => $tahunAjaranObj ? $tahunAjaranObj->nama : '-',
            ];
        }

        $qrData = PrintService::createVerification(
            'Daftar Hadir Guru',
            'Daftar Hadir Guru/Pegawai',
            now()->toDateString()
        );

        return view('print.daftar-hadir-guru-bulk', [
            'kopUrl' => PrintService::getKopUrl(),
            'sections' => $sections,
            'tanggalCetak' => PrintService::formatDate(now()),
            'kepalaSekolah' => PrintService::getKepalaSekolah(),
            'tataUsaha' => PrintService::getTataUsaha(),
            'qrCode' => $qrData['qrCode'],
        ]);
    }
}
