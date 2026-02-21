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
use App\Models\TahunAjaran;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class GuruRiwayatController extends Controller
{
    /**
     * Get riwayat mengajar as flat daily entries with guru_status
     * Includes both attended (H) and missed (A - Alpha) schedules
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

        $search = $request->input('search', '');
        $result = [];

        // Map of Indonesian day names to Carbon day numbers
        $dayMap = [
            'Senin' => Carbon::MONDAY,
            'Selasa' => Carbon::TUESDAY,
            'Rabu' => Carbon::WEDNESDAY,
            'Kamis' => Carbon::THURSDAY,
            'Jumat' => Carbon::FRIDAY,
            'Sabtu' => Carbon::SATURDAY,
            'Minggu' => Carbon::SUNDAY,
        ];

        // Get tahun ajaran filter
        $tahunAjaranId = $user->tahun_ajaran_id ?? TahunAjaran::getCurrent()?->id;

        // Get all jadwal for this guru filtered by tahun ajaran
        $jadwalQuery = Jadwal::with(['mapel', 'kelas'])
            ->where('guru_id', $guru->id)
            ->where('status', 'Aktif')
            ->when($tahunAjaranId, fn($q) => $q->where('tahun_ajaran_id', $tahunAjaranId));

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

        // Get tahun ajaran date range for scoping data
        $tahunAjaran = TahunAjaran::find($tahunAjaranId);
        $startDate = $tahunAjaran ? Carbon::parse($tahunAjaran->tanggal_mulai)->startOfDay() : Carbon::now()->subMonths(6)->startOfDay();

        // Get all existing absensi for this guru within tahun ajaran
        $existingAbsensi = AbsensiMengajar::with(['jadwal.mapel', 'jadwal.kelas'])
            ->where('guru_id', $guru->id)
            ->where('tanggal', '>=', $startDate)
            ->get()
            ->keyBy(function ($item) {
                return $item->jadwal_id . '-' . $item->tanggal->format('Y-m-d');
            });

        // Calculate past occurrences for each jadwal (last 30 days)
        $today = Carbon::now();

        foreach ($jadwalList as $jadwal) {
            $dayNumber = $dayMap[$jadwal->hari] ?? null;
            if ($dayNumber === null)
                continue;

            // Find all occurrences of this day within tahun ajaran
            $checkDate = $startDate->copy();
            while ($checkDate->dayOfWeek !== $dayNumber) {
                $checkDate->addDay();
            }

            while ($checkDate->lte($today)) {
                // Check if this occurrence has passed (date + jam_selesai < now)
                $endTime = Carbon::parse($checkDate->format('Y-m-d') . ' ' . $jadwal->jam_selesai);
                if ($endTime->gt($today)) {
                    $checkDate->addWeek();
                    continue;
                }

                $key = $jadwal->id . '-' . $checkDate->format('Y-m-d');
                $absensi = $existingAbsensi->get($key);

                if ($absensi) {
                    // Guru has absensi record - use snapshot counts
                    $totalSiswa = $absensi->siswa_hadir + $absensi->siswa_sakit + $absensi->siswa_izin + $absensi->siswa_alpha;
                    // Fallback to daily query if snapshot is empty (old data)
                    if ($totalSiswa === 0) {
                        $dailyCounts = $this->getDailySiswaCounts($jadwal->kelas_id, $checkDate->format('Y-m-d'));
                        $totalSiswa = \App\Models\Siswa::where('kelas_id', $jadwal->kelas_id)->where('status', 'Aktif')->count();
                        $hadir = $totalSiswa - ($dailyCounts['S'] + $dailyCounts['I'] + $dailyCounts['A']);
                        $izinSakit = $dailyCounts['I'] + $dailyCounts['S'];
                        $alpha = $dailyCounts['A'];
                    } else {
                        $hadir = $absensi->siswa_hadir;
                        $izinSakit = $absensi->siswa_izin + $absensi->siswa_sakit;
                        $alpha = $absensi->siswa_alpha;
                    }

                    $result[] = [
                        'id' => $absensi->id,
                        'jadwal_id' => $jadwal->id,
                        'mapel_id' => $jadwal->mapel_id,
                        'kelas_id' => $jadwal->kelas_id,
                        'mapel' => $jadwal->mapel->nama_mapel ?? 'Unknown',
                        'kelas' => $jadwal->kelas->nama_kelas ?? 'Unknown',
                        'jam_ke' => $jadwal->jam_ke,
                        'tanggal' => $checkDate->copy()->translatedFormat('d M Y'),
                        'tanggal_raw' => $checkDate->format('Y-m-d'),
                        'waktu' => substr($jadwal->jam_mulai ?? '00:00', 0, 5) . ' - ' . substr($jadwal->jam_selesai ?? '00:00', 0, 5),
                        'hari' => $jadwal->hari,
                        'guru_status' => $absensi->guru_status ?? 'H',
                        'guru_keterangan' => $absensi->guru_keterangan,
                        'guru_tugas_id' => $absensi->guru_tugas_id,
                        'tugas_siswa' => $absensi->tugas_siswa,
                        'ringkasan_materi' => $absensi->ringkasan_materi,
                        'berita_acara' => $absensi->berita_acara,
                        'hadir' => $hadir,
                        'izin' => $izinSakit,
                        'alpha' => $alpha,
                        'total_siswa' => $totalSiswa,
                    ];
                } else {
                    // Guru missed - no absensi record (Alpha)
                    $result[] = [
                        'id' => null,
                        'jadwal_id' => $jadwal->id,
                        'mapel_id' => $jadwal->mapel_id,
                        'kelas_id' => $jadwal->kelas_id,
                        'mapel' => $jadwal->mapel->nama_mapel ?? 'Unknown',
                        'kelas' => $jadwal->kelas->nama_kelas ?? 'Unknown',
                        'jam_ke' => $jadwal->jam_ke,
                        'tanggal' => $checkDate->copy()->translatedFormat('d M Y'),
                        'tanggal_raw' => $checkDate->format('Y-m-d'),
                        'waktu' => substr($jadwal->jam_mulai ?? '00:00', 0, 5) . ' - ' . substr($jadwal->jam_selesai ?? '00:00', 0, 5),
                        'hari' => $jadwal->hari,
                        'guru_status' => 'A',
                        'guru_keterangan' => 'Tidak melakukan absensi',
                        'ringkasan_materi' => null,
                        'berita_acara' => null,
                        'hadir' => 0,
                        'izin' => 0,
                        'alpha' => 0,
                        'total_siswa' => 0,
                    ];
                }

                $checkDate->addWeek();
            }
        }

        // Also include historical absensi records (imported data with jadwal_id = null)
        // These use snapshot data instead of jadwal references
        $historicalAbsensi = AbsensiMengajar::where('guru_id', $guru->id)
            ->whereNull('jadwal_id')
            ->where('tanggal', '>=', $startDate)
            ->when($search, function ($q) use ($search) {
                $q->where(function ($sq) use ($search) {
                    $sq->where('snapshot_mapel', 'like', "%{$search}%")
                        ->orWhere('snapshot_kelas', 'like', "%{$search}%");
                });
            })
            ->get();

        // Build kelas name -> id map for historical data
        $kelasNameMap = \App\Models\Kelas::pluck('id', 'nama_kelas')->toArray();

        foreach ($historicalAbsensi as $absensi) {
            $totalSiswa = $absensi->siswa_hadir + $absensi->siswa_sakit + $absensi->siswa_izin + $absensi->siswa_alpha;
            // Fallback to daily query if snapshot is empty (old data)
            if ($totalSiswa === 0) {
                $kelasId = $kelasNameMap[$absensi->snapshot_kelas] ?? null;
                $dailyCounts = $kelasId ? $this->getDailySiswaCounts($kelasId, Carbon::parse($absensi->tanggal)->format('Y-m-d')) : ['S' => 0, 'I' => 0, 'A' => 0];
                $totalSiswa = $kelasId ? \App\Models\Siswa::where('kelas_id', $kelasId)->where('status', 'Aktif')->count() : 0;
                $hadir = $totalSiswa - ($dailyCounts['S'] + $dailyCounts['I'] + $dailyCounts['A']);
                $izinSakit = $dailyCounts['I'] + $dailyCounts['S'];
                $alpha = $dailyCounts['A'];
            } else {
                $hadir = $absensi->siswa_hadir;
                $izinSakit = $absensi->siswa_izin + $absensi->siswa_sakit;
                $alpha = $absensi->siswa_alpha;
            }

            $result[] = [
                'id' => $absensi->id,
                'jadwal_id' => null,
                'mapel' => $absensi->snapshot_mapel ?? 'Unknown',
                'kelas' => $absensi->snapshot_kelas ?? 'Unknown',
                'jam_ke' => $absensi->snapshot_jam ?? '-',
                'tanggal' => Carbon::parse($absensi->tanggal)->translatedFormat('d M Y'),
                'tanggal_raw' => Carbon::parse($absensi->tanggal)->format('Y-m-d'),
                'waktu' => $absensi->snapshot_jam ?? '-',
                'hari' => $absensi->snapshot_hari ?? '-',
                'guru_status' => $absensi->guru_status ?? 'H',
                'guru_keterangan' => $absensi->guru_keterangan,
                'guru_tugas_id' => $absensi->guru_tugas_id,
                'tugas_siswa' => $absensi->tugas_siswa,
                'ringkasan_materi' => $absensi->ringkasan_materi,
                'berita_acara' => $absensi->berita_acara,
                'hadir' => $hadir,
                'izin' => $izinSakit,
                'alpha' => $alpha,
                'total_siswa' => $totalSiswa,
            ];
        }

        // Sort by date descending
        usort($result, function ($a, $b) {
            return strcmp($b['tanggal_raw'], $a['tanggal_raw']);
        });



        return response()->json([
            'success' => true,
            'data' => $result
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

        $absensi = AbsensiMengajar::with(['jadwal.mapel', 'jadwal.kelas.siswa', 'guruTugas'])
            ->where('id', $id)
            ->where('guru_id', $guru->id)
            ->first();

        if (!$absensi) {
            return response()->json([
                'success' => false,
                'message' => 'Absensi not found'
            ], 404);
        }

        // Get kelas for fetching all students
        $kelas = null;
        $kelasId = null;
        if ($absensi->jadwal && $absensi->jadwal->kelas) {
            $kelas = $absensi->jadwal->kelas;
            $kelasId = $kelas->id;
        } elseif ($absensi->snapshot_kelas) {
            $kelas = \App\Models\Kelas::where('nama_kelas', $absensi->snapshot_kelas)->first();
            $kelasId = $kelas?->id;
        }

        // Get daily absensi siswa for this date + kelas (per-day system)
        $tanggal = Carbon::parse($absensi->tanggal)->format('Y-m-d');
        $dailyAbsensi = $kelasId
            ? AbsensiSiswa::where('kelas_id', $kelasId)->where('tanggal', $tanggal)->get()->keyBy('siswa_id')
            : collect();

        // Build siswa list - merge all active class students with daily absensi
        $siswaList = collect();
        if ($kelas) {
            $allSiswa = $kelas->siswa()->where('status', 'Aktif')->orderBy('nama')->get();
            foreach ($allSiswa as $siswa) {
                $absensiRecord = $dailyAbsensi->get($siswa->id);
                $siswaList->push([
                    'id' => $absensiRecord?->id,
                    'siswa_id' => $siswa->id,
                    'nama' => $siswa->nama,
                    'nis' => $siswa->nis ?? '-',
                    'status' => $absensiRecord?->status ?? 'H',
                    'keterangan' => $absensiRecord?->keterangan ?? '',
                ]);
            }
        } else {
            // Fallback: use daily absensi records with siswa info
            $siswaList = $dailyAbsensi->map(function ($as) {
                $siswa = \App\Models\Siswa::find($as->siswa_id);
                return [
                    'id' => $as->id,
                    'siswa_id' => $as->siswa_id,
                    'nama' => $siswa?->nama ?? 'Unknown',
                    'nis' => $siswa?->nis ?? '-',
                    'status' => $as->status,
                    'keterangan' => $as->keterangan,
                ];
            })->values();
        }

        // Count statuses from the merged list
        $hadir = $siswaList->where('status', 'H')->count();
        $izin = $siswaList->where('status', 'I')->count();
        $sakit = $siswaList->where('status', 'S')->count();
        $alpha = $siswaList->where('status', 'A')->count();

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $absensi->id,
                'jadwal_id' => $absensi->jadwal_id,
                'tanggal' => Carbon::parse($absensi->tanggal)->translatedFormat('d F Y'),
                'mapel' => $absensi->jadwal->mapel->nama_mapel ?? $absensi->snapshot_mapel ?? 'Unknown',
                'kelas' => $absensi->jadwal->kelas->nama_kelas ?? $absensi->snapshot_kelas ?? 'Unknown',
                'ringkasan_materi' => $absensi->ringkasan_materi,
                'berita_acara' => $absensi->berita_acara,
                'guru_name' => $guru->nama ?? 'Guru',
                'guru_nip' => $guru->nip ?? '',
                'guru_status' => $absensi->guru_status ?? 'H',
                'guru_keterangan' => $absensi->guru_keterangan,
                'guru_tugas_id' => $absensi->guru_tugas_id,
                'guru_tugas_nama' => $absensi->guruTugas?->nama,
                'tugas_siswa' => $absensi->tugas_siswa,
                'stats' => [
                    'hadir' => $hadir,
                    'izin' => $izin + $sakit,
                    'alpha' => $alpha,
                    'total' => $siswaList->count(),
                ],
                'siswa' => $siswaList->values(),
            ]
        ]);
    }

    /**
     * Get riwayat kegiatan for this guru
     * Includes proper attendance status (H/A) based on absensi records
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
        $now = Carbon::now();

        // Get tahun ajaran filter
        $tahunAjaranId = $user->tahun_ajaran_id ?? TahunAjaran::getCurrent()?->id;

        // Get kegiatan where guru is PJ or in pendamping array
        $kegiatanQuery = Kegiatan::with('absensiKegiatan')
            ->where(function ($q) use ($guru) {
                $q->where('penanggung_jawab_id', $guru->id)
                    ->orWhereJsonContains('guru_pendamping', $guru->id)
                    ->orWhereJsonContains('guru_pendamping', (string) $guru->id);
            })
            ->when($tahunAjaranId, fn($q) => $q->where('tahun_ajaran_id', $tahunAjaranId))
            ->whereNotNull('waktu_mulai')
            ->orderBy('waktu_mulai', 'desc');

        if ($search) {
            $kegiatanQuery->where('nama_kegiatan', 'like', "%{$search}%");
        }

        $kegiatanList = $kegiatanQuery->get();

        // Helper function to find attendance in JSON array
        $findAttendance = function ($array, $id) {
            if (!is_array($array))
                return null;
            foreach ($array as $item) {
                if (isset($item['guru_id']) && $item['guru_id'] == $id) {
                    return $item;
                }
            }
            return null;
        };

        $result = $kegiatanList->map(function ($kegiatan) use ($guru, $now, $findAttendance) {
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

            // Determine attendance status
            $guruStatus = 'H'; // Default
            $guruKeterangan = null;

            // Check if kegiatan has passed
            $isPast = $waktuSelesai->lt($now);

            if ($isPast) {
                // Get absensi record for this kegiatan
                $absensiRecord = $kegiatan->absensiKegiatan->first();

                if ($absensiRecord) {
                    if ($isPJ) {
                        // PJ status is in pj_status column
                        $guruStatus = $absensiRecord->pj_status ?? 'A';
                        $guruKeterangan = $absensiRecord->pj_keterangan;
                    } else {
                        // Pendamping status is in absensi_pendamping JSON
                        $absensiPendamping = $absensiRecord->absensi_pendamping ?? [];
                        $attendance = $findAttendance($absensiPendamping, $guru->id);
                        if ($attendance) {
                            $guruStatus = $attendance['status'] ?? 'H';
                            $guruKeterangan = $attendance['keterangan'] ?? null;
                        } else {
                            $guruStatus = 'A';
                            $guruKeterangan = 'Tidak tercatat dalam absensi';
                        }
                    }
                } else {
                    // No absensi record = Alpha
                    $guruStatus = 'A';
                    $guruKeterangan = 'Tidak ada record absensi';
                }
            }

            // Get absensi_id for print functionality
            $absensiId = null;
            $absensiRecord = $kegiatan->absensiKegiatan->first();
            if ($absensiRecord) {
                $absensiId = $absensiRecord->id;
            }

            return [
                'id' => $kegiatan->id,
                'absensi_id' => $absensiId,
                'nama' => $kegiatan->nama_kegiatan,
                'tanggal' => $waktuMulai->translatedFormat('d F Y'),
                'tanggal_raw' => $waktuMulai->format('Y-m-d'),
                'time' => $waktuMulai->format('H:i') . ' - ' . $waktuSelesai->format('H:i'),
                'role' => $role,
                'is_past' => $isPast,
                'lokasi' => $kegiatan->tempat,
                'guru_status' => $guruStatus,
                'guru_keterangan' => $guruKeterangan,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $result,
        ]);
    }

    /**
     * Get riwayat rapat for this guru
     * Includes proper attendance status (H/A) based on absensi records
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
        $now = Carbon::now();

        // Get tahun ajaran filter
        $tahunAjaranId = $user->tahun_ajaran_id ?? TahunAjaran::getCurrent()?->id;

        // Get rapat where guru is pimpinan, sekretaris, or in peserta_rapat array
        $rapatQuery = Rapat::with('absensiRapat')
            ->where(function ($q) use ($guru) {
                $q->where('pimpinan_id', $guru->id)
                    ->orWhere('sekretaris_id', $guru->id)
                    ->orWhereJsonContains('peserta_rapat', $guru->id)
                    ->orWhereJsonContains('peserta_rapat', (string) $guru->id);
            })
            ->when($tahunAjaranId, fn($q) => $q->where('tahun_ajaran_id', $tahunAjaranId))
            ->orderBy('tanggal', 'desc');

        if ($search) {
            $rapatQuery->where('agenda_rapat', 'like', "%{$search}%");
        }

        $rapatList = $rapatQuery->get();

        // Helper function to find attendance in JSON array
        $findAttendance = function ($array, $id) {
            if (!is_array($array))
                return null;
            foreach ($array as $item) {
                if (isset($item['guru_id']) && $item['guru_id'] == $id) {
                    return $item;
                }
            }
            return null;
        };

        $result = $rapatList->map(function ($rapat) use ($guru, $now, $findAttendance) {
            $role = 'Peserta';
            $isPimpinan = $rapat->pimpinan_id == $guru->id;
            $isSekretaris = $rapat->sekretaris_id == $guru->id;

            if ($isPimpinan) {
                $role = 'Pimpinan';
            } elseif ($isSekretaris) {
                $role = 'Sekretaris';
            }

            // Determine if rapat has passed
            $rapatDate = Carbon::parse($rapat->tanggal);
            // Properly format date before concatenating with time
            $endTimeStr = $rapatDate->format('Y-m-d') . ' ' . substr($rapat->waktu_selesai, 0, 8);
            $endTime = Carbon::parse($endTimeStr);
            $isPast = $endTime->lt($now);

            // Determine attendance status - check absensi record regardless of timing
            $guruStatus = null;
            $guruKeterangan = null;

            // Get absensi record for this rapat
            $absensiRecord = $rapat->absensiRapat->first();

            if ($absensiRecord) {
                if ($isPimpinan) {
                    // Check if pimpinan has self-attended or has a status set
                    if ($absensiRecord->pimpinan_self_attended || $absensiRecord->pimpinan_status) {
                        $guruStatus = $absensiRecord->pimpinan_status ?? 'H';
                        $guruKeterangan = $absensiRecord->pimpinan_keterangan;
                    }
                } elseif ($isSekretaris) {
                    // Check if sekretaris status is set
                    if ($absensiRecord->sekretaris_status) {
                        $guruStatus = $absensiRecord->sekretaris_status;
                        $guruKeterangan = $absensiRecord->sekretaris_keterangan;
                    }
                } else {
                    // Peserta status is in absensi_peserta JSON
                    $absensiPeserta = $absensiRecord->absensi_peserta ?? [];
                    $attendance = $findAttendance($absensiPeserta, $guru->id);
                    if ($attendance) {
                        $guruStatus = $attendance['status'] ?? 'H';
                        $guruKeterangan = $attendance['keterangan'] ?? null;
                    }
                }
            }

            // If no status found yet and rapat is past, default to Alpha
            if ($guruStatus === null) {
                if ($isPast) {
                    $guruStatus = 'A';
                    $guruKeterangan = $absensiRecord ? 'Tidak tercatat dalam absensi' : 'Tidak ada record absensi';
                } else {
                    // Rapat not past and no self-attendance yet
                    $guruStatus = 'H'; // Will show as pending/default
                }
            }

            return [
                'id' => $rapat->id,
                'nama' => $rapat->agenda_rapat,
                'tanggal' => $rapatDate->translatedFormat('d F Y'),
                'tanggal_raw' => $rapatDate->format('Y-m-d'),
                'time' => substr($rapat->waktu_mulai, 0, 5) . ' - ' . substr($rapat->waktu_selesai, 0, 5),
                'role' => $role,
                'is_past' => $isPast,
                'lokasi' => $rapat->tempat,
                'guru_status' => $guruStatus,
                'guru_keterangan' => $guruKeterangan,
                'notulensi' => $rapat->notulensi,
                'peserta_eksternal' => $rapat->peserta_eksternal ?? [],
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $result,
        ]);
    }

    /**
     * Get detail kegiatan for riwayat
     */
    public function detailKegiatan(Request $request, $id)
    {
        $user = $request->user();
        $guru = $user->guru;

        if (!$guru) {
            return response()->json([
                'success' => false,
                'message' => 'Guru profile not found'
            ], 404);
        }

        $kegiatan = Kegiatan::with(['penanggungJawab', 'absensiKegiatan'])
            ->find($id);

        if (!$kegiatan) {
            return response()->json([
                'success' => false,
                'message' => 'Kegiatan not found'
            ], 404);
        }

        // Get the latest absensi record for this kegiatan
        $absensiRecord = $kegiatan->absensiKegiatan->first();
        $absensiPendamping = $absensiRecord ? ($absensiRecord->absensi_pendamping ?? []) : [];
        $absensiSiswa = $absensiRecord ? ($absensiRecord->absensi_siswa ?? []) : [];

        // Helper function to find attendance in JSON array
        $findAttendance = function ($array, $id, $idKey = 'guru_id') {
            if (!is_array($array))
                return null;
            foreach ($array as $item) {
                if (isset($item[$idKey]) && $item[$idKey] == $id) {
                    return $item;
                }
            }
            return null;
        };

        // Get guru pendamping with their attendance from JSON
        $guruPendamping = [];
        $pendampingIds = $kegiatan->guru_pendamping ?? [];
        if (is_array($pendampingIds) && count($pendampingIds) > 0) {
            $pendampingGurus = \App\Models\Guru::whereIn('id', $pendampingIds)->get();
            foreach ($pendampingGurus as $pg) {
                $absensi = $findAttendance($absensiPendamping, $pg->id);
                $guruPendamping[] = [
                    'id' => $pg->id,
                    'nama' => $pg->nama,
                    'nip' => $pg->nip,
                    'status' => $absensi ? ($absensi['status'] ?? 'H') : 'A',
                ];
            }
        }

        // Get siswa attendance from JSON
        $siswaList = [];
        if (is_array($absensiSiswa) && count($absensiSiswa) > 0) {
            $siswaIds = array_column($absensiSiswa, 'siswa_id');
            $siswaData = \App\Models\Siswa::with('kelas')->whereIn('id', $siswaIds)->get()->keyBy('id');
            foreach ($absensiSiswa as $as) {
                $siswa = $siswaData->get($as['siswa_id']);
                $siswaList[] = [
                    'siswa_id' => $as['siswa_id'],
                    'nama' => $siswa->nama ?? 'Unknown',
                    'nis' => $siswa->nis ?? '-',
                    'kelas' => $siswa->kelas->nama_kelas ?? '-',
                    'status' => $as['status'] ?? 'A',
                    'keterangan' => $as['keterangan'] ?? null,
                ];
            }
        }

        // Determine current guru's own status
        $guruStatus = 'H'; // Default if guru is PJ or in pendamping list
        $guruKeterangan = null;

        // Check if guru is PJ
        if ($kegiatan->penanggung_jawab_id == $guru->id && $absensiRecord) {
            $guruStatus = $absensiRecord->pj_status ?? 'H';
            $guruKeterangan = $absensiRecord->pj_keterangan;
        } else {
            // Check in pendamping list
            $guruAbsensi = $findAttendance($absensiPendamping, $guru->id);
            if ($guruAbsensi) {
                $guruStatus = $guruAbsensi['status'] ?? 'H';
                $guruKeterangan = $guruAbsensi['keterangan'] ?? null;
            }
        }

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $kegiatan->id,
                'nama' => $kegiatan->nama_kegiatan,
                'lokasi' => $kegiatan->tempat,
                'guru_status' => $guruStatus,
                'guru_keterangan' => $guruKeterangan,
                'guru_pendamping' => $guruPendamping,
                'siswa' => $siswaList,
            ]
        ]);
    }

    /**
     * Get detail rapat for riwayat
     */
    public function detailRapat(Request $request, $id)
    {
        $user = $request->user();
        $guru = $user->guru;

        if (!$guru) {
            return response()->json([
                'success' => false,
                'message' => 'Guru profile not found'
            ], 404);
        }

        $rapat = Rapat::with(['pimpinanGuru', 'sekretarisGuru', 'absensiRapat'])
            ->find($id);

        if (!$rapat) {
            return response()->json([
                'success' => false,
                'message' => 'Rapat not found'
            ], 404);
        }

        // Get the absensi record for this rapat
        $absensiRecord = $rapat->absensiRapat->first();
        $absensiPeserta = $absensiRecord ? ($absensiRecord->absensi_peserta ?? []) : [];

        // Helper function to find attendance in JSON array
        $findAttendance = function ($array, $id) {
            if (!is_array($array))
                return null;
            foreach ($array as $item) {
                if (isset($item['guru_id']) && $item['guru_id'] == $id) {
                    return $item;
                }
            }
            return null;
        };

        // Get pimpinan info
        $pimpinan = null;
        if ($rapat->pimpinanGuru) {
            $pimpinan = [
                'id' => $rapat->pimpinanGuru->id,
                'nama' => $rapat->pimpinanGuru->nama,
                'nip' => $rapat->pimpinanGuru->nip,
                'status' => $absensiRecord ? ($absensiRecord->pimpinan_status ?? 'A') : 'A',
            ];
        }

        // Get sekretaris info
        $sekretaris = null;
        if ($rapat->sekretarisGuru) {
            $sekretaris = [
                'id' => $rapat->sekretarisGuru->id,
                'nama' => $rapat->sekretarisGuru->nama,
                'nip' => $rapat->sekretarisGuru->nip,
                'status' => $absensiRecord ? ($absensiRecord->sekretaris_status ?? 'A') : 'A',
            ];
        }

        // Get peserta with attendance from JSON (exclude pimpinan/sekretaris)
        $peserta = [];
        $pesertaIds = $rapat->peserta_rapat ?? [];
        $excludeIds = array_filter([$rapat->pimpinan_id, $rapat->sekretaris_id]);
        if (is_array($pesertaIds) && count($pesertaIds) > 0) {
            $filteredIds = array_diff($pesertaIds, $excludeIds);
            $pesertaGurus = \App\Models\Guru::whereIn('id', $filteredIds)->get();
            foreach ($pesertaGurus as $pg) {
                $absensi = $findAttendance($absensiPeserta, $pg->id);
                $peserta[] = [
                    'id' => $pg->id,
                    'nama' => $pg->nama,
                    'nip' => $pg->nip,
                    'status' => $absensi ? ($absensi['status'] ?? 'H') : 'A',
                ];
            }
        }

        // Determine current guru's own status
        $guruStatus = 'H';
        $guruKeterangan = null;

        // Check if guru is pimpinan
        if ($rapat->pimpinan_id == $guru->id && $absensiRecord) {
            $guruStatus = $absensiRecord->pimpinan_status ?? 'H';
            $guruKeterangan = $absensiRecord->pimpinan_keterangan;
        }
        // Check if guru is sekretaris
        elseif ($rapat->sekretaris_id == $guru->id && $absensiRecord) {
            $guruStatus = $absensiRecord->sekretaris_status ?? 'H';
            $guruKeterangan = $absensiRecord->sekretaris_keterangan;
        }
        // Check in peserta list
        else {
            $guruAbsensi = $findAttendance($absensiPeserta, $guru->id);
            if ($guruAbsensi) {
                $guruStatus = $guruAbsensi['status'] ?? 'H';
                $guruKeterangan = $guruAbsensi['keterangan'] ?? null;
            }
        }

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $rapat->id,
                'nama' => $rapat->agenda_rapat,
                'lokasi' => $rapat->tempat,
                'notulensi' => $absensiRecord->notulensi ?? $rapat->notulensi ?? null,
                'foto_rapat' => $absensiRecord->foto_rapat ?? [],
                'guru_status' => $guruStatus,
                'guru_keterangan' => $guruKeterangan,
                'pimpinan' => $pimpinan,
                'sekretaris' => $sekretaris,
                'peserta' => $peserta,
                'peserta_eksternal' => $rapat->peserta_eksternal ?? [],
            ]
        ]);
    }

    /**
     * Get daily siswa absence counts for a kelas on a given date.
     * Returns counts of S, I, A (only non-hadir stored in DB).
     */
    private function getDailySiswaCounts(int $kelasId, string $tanggal): array
    {
        $counts = AbsensiSiswa::where('kelas_id', $kelasId)
            ->where('tanggal', $tanggal)
            ->selectRaw("status, count(*) as cnt")
            ->groupBy('status')
            ->pluck('cnt', 'status')
            ->toArray();

        return [
            'S' => $counts['S'] ?? 0,
            'I' => $counts['I'] ?? 0,
            'A' => $counts['A'] ?? 0,
        ];
    }
}
