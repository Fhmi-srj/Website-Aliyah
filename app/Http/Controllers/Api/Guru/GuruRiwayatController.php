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

        // Get all jadwal for this guru
        $jadwalQuery = Jadwal::with(['mapel', 'kelas'])
            ->where('guru_id', $guru->id)
            ->where('status', 'aktif');

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

        // Get all existing absensi for this guru (last 30 days)
        $thirtyDaysAgo = Carbon::now()->subDays(30)->startOfDay();
        $existingAbsensi = AbsensiMengajar::with(['jadwal.mapel', 'jadwal.kelas', 'absensiSiswa'])
            ->where('guru_id', $guru->id)
            ->where('tanggal', '>=', $thirtyDaysAgo)
            ->get()
            ->keyBy(function ($item) {
                return $item->jadwal_id . '-' . $item->tanggal->format('Y-m-d');
            });

        // Calculate past occurrences for each jadwal (last 30 days)
        $today = Carbon::now();

        foreach ($jadwalList as $jadwal) {
            $dayNumber = $dayMap[$jadwal->hari] ?? null;
            if ($dayNumber === null) continue;

            // Find all occurrences of this day in the last 30 days
            $checkDate = $thirtyDaysAgo->copy();
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
                    // Guru has absensi record - check guru_status
                    $hadir = $absensi->absensiSiswa->where('status', 'H')->count();
                    $izin = $absensi->absensiSiswa->where('status', 'I')->count();
                    $sakit = $absensi->absensiSiswa->where('status', 'S')->count();
                    $alpha = $absensi->absensiSiswa->where('status', 'A')->count();

                    $result[] = [
                        'id' => $absensi->id,
                        'jadwal_id' => $jadwal->id,
                        'mapel' => $jadwal->mapel->nama_mapel ?? 'Unknown',
                        'kelas' => $jadwal->kelas->nama_kelas ?? 'Unknown',
                        'tanggal' => $checkDate->copy()->translatedFormat('d M Y'),
                        'tanggal_raw' => $checkDate->format('Y-m-d'),
                        'waktu' => substr($jadwal->jam_mulai ?? '00:00', 0, 5) . ' - ' . substr($jadwal->jam_selesai ?? '00:00', 0, 5),
                        'hari' => $jadwal->hari,
                        'guru_status' => $absensi->guru_status ?? 'H',
                        'guru_keterangan' => $absensi->guru_keterangan,
                        'ringkasan_materi' => $absensi->ringkasan_materi,
                        'berita_acara' => $absensi->berita_acara,
                        'hadir' => $hadir,
                        'izin' => $izin + $sakit,
                        'alpha' => $alpha,
                        'total_siswa' => $absensi->absensiSiswa->count(),
                    ];
                } else {
                    // Guru missed - no absensi record (Alpha)
                    $result[] = [
                        'id' => null,
                        'jadwal_id' => $jadwal->id,
                        'mapel' => $jadwal->mapel->nama_mapel ?? 'Unknown',
                        'kelas' => $jadwal->kelas->nama_kelas ?? 'Unknown',
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

        // Sort by date descending
        usort($result, function ($a, $b) {
            return strcmp($b['tanggal_raw'], $a['tanggal_raw']);
        });

        // Limit to 50 results
        $result = array_slice($result, 0, 50);

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
                'guru_name' => $guru->nama ?? 'Guru',
                'guru_nip' => $guru->nip ?? '',
                'guru_status' => $absensi->guru_status ?? 'H',
                'guru_keterangan' => $absensi->guru_keterangan,
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

        // Get kegiatan where guru is PJ or in pendamping array
        $kegiatanQuery = Kegiatan::with('absensiKegiatan')
            ->where(function ($q) use ($guru) {
                $q->where('penanggung_jawab_id', $guru->id)
                    ->orWhereJsonContains('guru_pendamping', $guru->id)
                    ->orWhereJsonContains('guru_pendamping', (string) $guru->id);
            })
            ->whereNotNull('waktu_mulai')
            ->orderBy('waktu_mulai', 'desc');

        if ($search) {
            $kegiatanQuery->where('nama_kegiatan', 'like', "%{$search}%");
        }

        $kegiatanList = $kegiatanQuery->take(50)->get();

        // Helper function to find attendance in JSON array
        $findAttendance = function ($array, $id) {
            if (!is_array($array)) return null;
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

            return [
                'id' => $kegiatan->id,
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

        // Get rapat where guru is pimpinan, sekretaris, or in peserta_rapat array
        $rapatQuery = Rapat::with('absensiRapat')
            ->where(function ($q) use ($guru) {
                $q->where('pimpinan_id', $guru->id)
                    ->orWhere('sekretaris_id', $guru->id)
                    ->orWhereJsonContains('peserta_rapat', $guru->id)
                    ->orWhereJsonContains('peserta_rapat', (string) $guru->id);
            })
            ->orderBy('tanggal', 'desc');

        if ($search) {
            $rapatQuery->where('agenda_rapat', 'like', "%{$search}%");
        }

        $rapatList = $rapatQuery->take(50)->get();

        // Helper function to find attendance in JSON array
        $findAttendance = function ($array, $id) {
            if (!is_array($array)) return null;
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

            // Determine attendance status
            $guruStatus = 'H'; // Default
            $guruKeterangan = null;

            if ($isPast) {
                // Get absensi record for this rapat
                $absensiRecord = $rapat->absensiRapat->first();

                if ($absensiRecord) {
                    if ($isPimpinan) {
                        $guruStatus = $absensiRecord->pimpinan_status ?? 'A';
                        $guruKeterangan = $absensiRecord->pimpinan_keterangan;
                    } elseif ($isSekretaris) {
                        $guruStatus = $absensiRecord->sekretaris_status ?? 'A';
                        $guruKeterangan = $absensiRecord->sekretaris_keterangan;
                    } else {
                        // Peserta status is in absensi_peserta JSON
                        $absensiPeserta = $absensiRecord->absensi_peserta ?? [];
                        $attendance = $findAttendance($absensiPeserta, $guru->id);
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
            if (!is_array($array)) return null;
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
            if (!is_array($array)) return null;
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

        // Get peserta with attendance from JSON
        $peserta = [];
        $pesertaIds = $rapat->peserta_rapat ?? [];
        if (is_array($pesertaIds) && count($pesertaIds) > 0) {
            $pesertaGurus = \App\Models\Guru::whereIn('id', $pesertaIds)->get();
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
                'guru_status' => $guruStatus,
                'guru_keterangan' => $guruKeterangan,
                'pimpinan' => $pimpinan,
                'sekretaris' => $sekretaris,
                'peserta' => $peserta,
            ]
        ]);
    }
}
