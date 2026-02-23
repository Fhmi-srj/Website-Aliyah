<?php

namespace App\Http\Controllers\Api\Guru;

use App\Http\Controllers\Controller;
use App\Models\Jadwal;
use App\Models\Kegiatan;
use App\Models\Rapat;
use App\Models\Guru;
use App\Models\AbsensiKegiatan;
use App\Models\AbsensiMengajar;
use App\Models\AbsensiRapat;
use App\Models\TahunAjaran;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;


class GuruDashboardController extends Controller
{
    /**
     * Get dashboard data for the logged-in guru
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $guru = $user->guru;

        // If no guru relation, return fallback data with user info
        if (!$guru) {
            $today = Carbon::today();
            return response()->json([
                'user' => [
                    'name' => $user->name,
                    'nip' => '-',
                    'jabatan' => $user->role ?? 'User',
                    'foto_url' => null,
                ],
                'today' => [
                    'date' => $today->locale('id')->translatedFormat('l, d F Y'),
                    'scheduleCount' => 0,
                ],
                'todaySchedule' => [],
                'todayActivities' => [],
                'todayMeetings' => [],
                'stats' => [
                    'totalMengajar' => 0,
                    'hadir' => 0,
                    'izin' => 0,
                    'sakit' => 0,
                    'percentage' => 0,
                ],
                'reminders' => [],
            ]);
        }

        // Use explicit Jakarta timezone
        $today = Carbon::today('Asia/Jakarta');
        $dayName = $this->getDayName($today->dayOfWeek);
        $currentTime = Carbon::now('Asia/Jakarta')->format('H:i');

        // Get today's teaching schedule with actual attendance status
        $todaySchedule = Jadwal::with(['mapel', 'kelas'])
            ->where('guru_id', $guru->id)
            ->where('hari', $dayName)
            ->where('status', 'Aktif')
            ->orderBy('jam_mulai')
            ->get()
            ->map(function ($jadwal) use ($currentTime, $today) {
                // Check if already attended today
                $absensi = AbsensiMengajar::where('jadwal_id', $jadwal->id)
                    ->where('tanggal', $today->toDateString())
                    ->first();

                $now = Carbon::now('Asia/Jakarta');
                $jamMulai = Carbon::parse($today->toDateString() . ' ' . $jadwal->jam_mulai);
                $jamSelesai = Carbon::parse($today->toDateString() . ' ' . $jadwal->jam_selesai);

                $status = 'belum_mulai';
                if ($absensi) {
                    $status = 'sudah_absen';
                } elseif ($now->greaterThan($jamSelesai)) {
                    $status = 'terlewat';
                } elseif ($now->greaterThanOrEqualTo($jamMulai) && $now->lessThanOrEqualTo($jamSelesai)) {
                    $status = 'sedang_berlangsung';
                }

                return [
                    'id' => $jadwal->id,
                    'time' => substr($jadwal->jam_mulai, 0, 5),
                    'endTime' => substr($jadwal->jam_selesai, 0, 5),
                    'subject' => $jadwal->mapel?->nama_mapel ?? 'Mata Pelajaran',
                    'class' => $jadwal->kelas?->nama_kelas ?? 'Kelas',
                    'status' => $status,
                ];
            });

        // Get today's activities where guru is PJ or pendamping (synced with AbsensiKegiatan)
        $todayActivities = Kegiatan::where('status', 'Aktif')
            ->whereDate('waktu_mulai', '<=', $today)
            ->whereDate('waktu_berakhir', '>=', $today)
            ->where(function ($query) use ($guru) {
                $query->where('penanggung_jawab_id', $guru->id)
                    ->orWhereJsonContains('guru_pendamping', $guru->id)
                    ->orWhereJsonContains('guru_pendamping', (string) $guru->id);
            })
            ->orderBy('waktu_mulai')
            ->get()
            ->map(function ($kegiatan) use ($currentTime, $guru, $today) {
                $startTime = Carbon::parse($kegiatan->waktu_mulai)->setTimezone('Asia/Jakarta')->format('H:i');
                $endTime = Carbon::parse($kegiatan->waktu_berakhir)->setTimezone('Asia/Jakarta')->format('H:i');
                $isPJ = $kegiatan->penanggung_jawab_id === $guru->id;

                // Get actual attendance status (same logic as GuruKegiatanController)
                $absensi = AbsensiKegiatan::where('kegiatan_id', $kegiatan->id)->first();
                $statusAbsensi = 'belum_mulai';

                if ($absensi) {
                    if ($isPJ) {
                        // For PJ: only 'submitted' counts as sudah_absen
                        if ($absensi->status === 'submitted') {
                            $statusAbsensi = 'sudah_absen';
                        } else {
                            // Draft exists but PJ hasn't submitted
                            $now = Carbon::now();
                            $mulai = Carbon::parse($kegiatan->waktu_mulai);
                            $selesai = Carbon::parse($kegiatan->waktu_berakhir);

                            if ($now->lt($mulai)) {
                                $statusAbsensi = 'belum_mulai';
                            } elseif ($now->between($mulai, $selesai)) {
                                $statusAbsensi = 'sedang_berlangsung';
                            } else {
                                $statusAbsensi = 'terlewat';
                            }
                        }
                    } else {
                        // For Pendamping: check if self-attended
                        $pendampingAbsensi = $absensi->absensi_pendamping ?? [];
                        $selfAttended = false;
                        foreach ($pendampingAbsensi as $entry) {
                            if ($entry['guru_id'] == $guru->id && !empty($entry['self_attended'])) {
                                $selfAttended = true;
                                break;
                            }
                        }

                        if ($selfAttended) {
                            $statusAbsensi = 'sudah_absen';
                        } else {
                            $now = Carbon::now();
                            $mulai = Carbon::parse($kegiatan->waktu_mulai);
                            $selesai = Carbon::parse($kegiatan->waktu_berakhir);

                            if ($now->lt($mulai)) {
                                $statusAbsensi = 'belum_mulai';
                            } elseif ($now->between($mulai, $selesai)) {
                                $statusAbsensi = 'sedang_berlangsung';
                            } else {
                                $statusAbsensi = 'terlewat';
                            }
                        }
                    }
                } else {
                    // No attendance record
                    $now = Carbon::now();
                    $mulai = Carbon::parse($kegiatan->waktu_mulai);
                    $selesai = Carbon::parse($kegiatan->waktu_berakhir);

                    if ($now->lt($mulai)) {
                        $statusAbsensi = 'belum_mulai';
                    } elseif ($now->between($mulai, $selesai)) {
                        $statusAbsensi = 'sedang_berlangsung';
                    } else {
                        $statusAbsensi = 'terlewat';
                    }
                }

                return [
                    'id' => $kegiatan->id,
                    'time' => $startTime,
                    'endTime' => $endTime,
                    'name' => $kegiatan->nama_kegiatan,
                    'location' => $kegiatan->tempat ?? 'N/A',
                    'status' => $statusAbsensi,
                    'isPJ' => $isPJ,
                ];
            });

        // Get today's meetings where guru is involved (pimpinan, sekretaris, or peserta)
        $todayMeetings = Rapat::whereDate('tanggal', $today)
            ->where('status', 'Dijadwalkan')
            ->where(function ($query) use ($guru) {
                $query->where('pimpinan_id', $guru->id)
                    ->orWhere('sekretaris_id', $guru->id)
                    ->orWhereJsonContains('peserta_rapat', $guru->id)
                    ->orWhereJsonContains('peserta_rapat', (string) $guru->id);
            })
            ->orderBy('waktu_mulai')
            ->get()
            ->map(function ($rapat) use ($currentTime, $guru, $today) {
                // Determine role
                $role = 'peserta';
                if ($rapat->pimpinan_id === $guru->id) {
                    $role = 'pimpinan';
                } elseif ($rapat->sekretaris_id === $guru->id) {
                    $role = 'sekretaris';
                }

                // Check attendance status - calculate manually to use consistent naming
                $now = Carbon::now();
                $startTime = Carbon::parse($today->format('Y-m-d') . ' ' . $rapat->waktu_mulai);
                $endTime = Carbon::parse($today->format('Y-m-d') . ' ' . $rapat->waktu_selesai);

                if ($now->lt($startTime)) {
                    $statusAbsensi = 'belum_mulai';
                } elseif ($now->between($startTime, $endTime)) {
                    $statusAbsensi = 'sedang_berlangsung';
                } else {
                    $statusAbsensi = 'terlewat';
                }

                // Check if guru has already attended
                $absensiRapat = \App\Models\AbsensiRapat::where('rapat_id', $rapat->id)->first();
                if ($absensiRapat) {
                    // Check if guru has attended
                    if ($role === 'pimpinan' && $absensiRapat->status_pimpinan) {
                        $statusAbsensi = 'sudah_absen';
                    } elseif ($role === 'sekretaris' && $absensiRapat->status === 'submitted') {
                        $statusAbsensi = 'sudah_absen';
                    } else {
                        // Check peserta
                        $pesertaAbsensi = $absensiRapat->absensi_peserta ?? [];
                        foreach ($pesertaAbsensi as $entry) {
                            if ($entry['guru_id'] == $guru->id && !empty($entry['self_attended'])) {
                                $statusAbsensi = 'sudah_absen';
                                break;
                            }
                        }
                    }
                }

                return [
                    'id' => $rapat->id,
                    'time' => substr($rapat->waktu_mulai, 0, 5),
                    'endTime' => substr($rapat->waktu_selesai, 0, 5),
                    'name' => $rapat->agenda_rapat,
                    'location' => $rapat->tempat ?? 'N/A',
                    'status' => $statusAbsensi,
                    'role' => $role,
                ];
            });

        // Calculate statistics for the entire tahun ajaran
        $tahunAjaran = $user->tahun_ajaran_id
            ? TahunAjaran::find($user->tahun_ajaran_id)
            : (TahunAjaran::getActive() ?? TahunAjaran::getCurrent());

        // Use resolved tahun ajaran ID for ALL stat queries
        $tahunAjaranId = $tahunAjaran ? $tahunAjaran->id : null;

        // Use tahun ajaran date range
        $startDate = $tahunAjaran ? Carbon::parse($tahunAjaran->tanggal_mulai)->startOfDay() : Carbon::now('Asia/Jakarta')->startOfYear();
        $endDate = $tahunAjaran ? Carbon::parse($tahunAjaran->tanggal_selesai)->endOfDay() : Carbon::now('Asia/Jakarta')->endOfYear();
        $today = Carbon::now('Asia/Jakarta')->startOfDay();

        // ============ STATS MENGAJAR ============
        // Get all jadwal for this guru (filtered by tahun ajaran)
        $guruJadwal = Jadwal::where('guru_id', $guru->id)
            ->where('status', 'Aktif')
            ->when($tahunAjaranId, fn($q) => $q->where('tahun_ajaran_id', $tahunAjaranId))
            ->get();

        // Calculate all teaching dates this month based on jadwal
        $mengajarTotal = 0;
        $mengajarHadir = 0;
        $mengajarIzin = 0;
        $mengajarAlpha = 0;

        $dayMapping = [
            'Minggu' => 0,
            'Senin' => 1,
            'Selasa' => 2,
            'Rabu' => 3,
            'Kamis' => 4,
            'Jumat' => 5,
            'Sabtu' => 6
        ];

        foreach ($guruJadwal as $jadwal) {
            $dayOfWeek = $dayMapping[$jadwal->hari] ?? null;
            if ($dayOfWeek === null)
                continue;

            // Find all dates of this day in tahun ajaran up to today
            $currentDate = $startDate->copy();
            while ($currentDate->lte($today) && $currentDate->lte($endDate)) {
                if ($currentDate->dayOfWeek === $dayOfWeek) {
                    $mengajarTotal++;

                    // Check if absensi exists for this date
                    $absensi = AbsensiMengajar::where('jadwal_id', $jadwal->id)
                        ->where('tanggal', $currentDate->toDateString())
                        ->first();

                    if ($absensi) {
                        // Check guru status from absensi record
                        if ($absensi->guru_status === 'I') {
                            $mengajarIzin++;
                        } else {
                            $mengajarHadir++;
                        }
                    } else {
                        // No attendance record = Alpha (only for past dates)
                        $jadwalEndTime = Carbon::parse($currentDate->toDateString() . ' ' . $jadwal->jam_selesai, 'Asia/Jakarta');
                        if (Carbon::now('Asia/Jakarta')->gt($jadwalEndTime)) {
                            $mengajarAlpha++;
                        }
                    }
                }
                $currentDate->addDay();
            }
        }

        // ============ STATS KEGIATAN ============
        // Get all kegiatan where guru is PJ or pendamping, that have ended
        $kegiatanThisYear = Kegiatan::where(function ($q) use ($guru) {
            $q->where('penanggung_jawab_id', $guru->id)
                ->orWhereJsonContains('guru_pendamping', $guru->id)
                ->orWhereJsonContains('guru_pendamping', (string) $guru->id);
        })
            // Filter by tahun_ajaran_id, or fallback to date range
            ->when($tahunAjaranId, function ($q) use ($tahunAjaranId) {
                $q->where('tahun_ajaran_id', $tahunAjaranId);
            }, function ($q) use ($startDate, $endDate) {
                $q->where('waktu_mulai', '>=', $startDate)
                    ->where('waktu_mulai', '<=', $endDate);
            })
            // Only count kegiatan that have ended
            ->where('waktu_berakhir', '<=', Carbon::now('Asia/Jakarta'))
            ->get();

        $kegiatanTotal = $kegiatanThisYear->count();
        $kegiatanHadir = 0;
        $kegiatanIzin = 0;
        $kegiatanAlpha = 0;

        foreach ($kegiatanThisYear as $kegiatan) {
            $absensiKeg = AbsensiKegiatan::where('kegiatan_id', $kegiatan->id)->first();
            $isPJ = $kegiatan->penanggung_jawab_id == $guru->id;
            $attended = false;
            $izin = false;

            if ($absensiKeg) {
                if ($isPJ) {
                    // PJ: Check pj_status field
                    if ($absensiKeg->status === 'submitted') {
                        if ($absensiKeg->pj_status === 'I') {
                            $izin = true;
                        } else {
                            $attended = true;
                        }
                    }
                } else {
                    // Check pendamping status - check ANY status set (by PJ or self)
                    $pendampingAbsensi = $absensiKeg->absensi_pendamping ?? [];
                    foreach ($pendampingAbsensi as $entry) {
                        if ($entry['guru_id'] == $guru->id) {
                            // Check status regardless of who set it
                            $status = $entry['status'] ?? 'A';
                            if ($status === 'H') {
                                $attended = true;
                            } elseif ($status === 'I') {
                                $izin = true;
                            }
                            // If status is 'A', neither attended nor izin is true, so it stays alpha
                            break;
                        }
                    }
                }
            }

            if ($attended) {
                $kegiatanHadir++;
            } elseif ($izin) {
                $kegiatanIzin++;
            } else {
                $kegiatanAlpha++;
            }
        }

        // ============ STATS RAPAT ============
        // Get all rapat where guru is involved, that have ended
        $rapatThisYear = Rapat::where(function ($q) use ($guru) {
            $q->where('pimpinan_id', $guru->id)
                ->orWhere('sekretaris_id', $guru->id)
                ->orWhereJsonContains('peserta_rapat', $guru->id)
                ->orWhereJsonContains('peserta_rapat', (string) $guru->id);
        })
            // Filter by tahun_ajaran_id, or fallback to date range
            ->when($tahunAjaranId, function ($q) use ($tahunAjaranId) {
                $q->where('tahun_ajaran_id', $tahunAjaranId);
            }, function ($q) use ($startDate, $endDate) {
                $q->whereDate('tanggal', '>=', $startDate)
                    ->whereDate('tanggal', '<=', $endDate);
            })
            ->get()
            ->filter(function ($rapat) {
                // Only count rapat that have ended
                try {
                    $tanggal = $rapat->tanggal instanceof \Carbon\Carbon
                        ? $rapat->tanggal->format('Y-m-d')
                        : (is_string($rapat->tanggal) ? substr($rapat->tanggal, 0, 10) : date('Y-m-d'));
                    $endTime = Carbon::parse($tanggal . ' ' . $rapat->waktu_selesai, 'Asia/Jakarta');
                    return Carbon::now('Asia/Jakarta')->gt($endTime);
                } catch (\Exception $e) {
                    return false; // Skip if can't parse
                }
            });

        $rapatTotal = $rapatThisYear->count();
        $rapatHadir = 0;
        $rapatIzin = 0;
        $rapatAlpha = 0;

        foreach ($rapatThisYear as $rapat) {
            $absensiRapat = \App\Models\AbsensiRapat::where('rapat_id', $rapat->id)->first();
            $isPimpinan = $rapat->pimpinan_id == $guru->id;
            $isSekretaris = $rapat->sekretaris_id == $guru->id;
            $attended = false;
            $izin = false;

            if ($absensiRapat) {
                if ($isPimpinan) {
                    // Check pimpinan status (regardless of who set it)
                    $status = $absensiRapat->pimpinan_status ?? 'A';
                    if ($status === 'H') {
                        $attended = true;
                    } elseif ($status === 'I' || $status === 'S') {
                        $izin = true;
                    }
                } elseif ($isSekretaris) {
                    // Sekretaris: Check if submitted
                    if ($absensiRapat->status === 'submitted') {
                        $status = $absensiRapat->sekretaris_status ?? 'A';
                        if ($status === 'H') {
                            $attended = true;
                        } elseif ($status === 'I' || $status === 'S') {
                            $izin = true;
                        }
                    }
                } else {
                    // Check peserta array - check ANY status set (by Sekretaris or self)
                    $pesertaAbsensi = $absensiRapat->absensi_peserta ?? [];
                    foreach ($pesertaAbsensi as $entry) {
                        if (isset($entry['guru_id']) && $entry['guru_id'] == $guru->id) {
                            // Check status regardless of who set it
                            $status = $entry['status'] ?? 'A';
                            if ($status === 'H') {
                                $attended = true;
                            } elseif ($status === 'I' || $status === 'S') {
                                $izin = true;
                            }
                            break;
                        }
                    }
                }
            }

            if ($attended) {
                $rapatHadir++;
            } elseif ($izin) {
                $rapatIzin++;
            } else {
                $rapatAlpha++;
            }
        }

        $stats = [
            'mengajar' => [
                'total' => $mengajarTotal,
                'hadir' => $mengajarHadir,
                'izin' => $mengajarIzin,
                'alpha' => $mengajarAlpha,
                'percentage' => $mengajarTotal > 0 ? round($mengajarHadir / $mengajarTotal * 100) : 0,
            ],
            'kegiatan' => [
                'total' => $kegiatanTotal,
                'hadir' => $kegiatanHadir,
                'izin' => $kegiatanIzin,
                'alpha' => $kegiatanAlpha,
                'percentage' => $kegiatanTotal > 0 ? round($kegiatanHadir / $kegiatanTotal * 100) : 0,
            ],
            'rapat' => [
                'total' => $rapatTotal,
                'hadir' => $rapatHadir,
                'izin' => $rapatIzin,
                'alpha' => $rapatAlpha,
                'percentage' => $rapatTotal > 0 ? round($rapatHadir / $rapatTotal * 100) : 0,
            ],
        ];

        // Generate reminders
        $reminders = $this->generateReminders($todaySchedule, $todayActivities, $todayMeetings, $currentTime);

        return response()->json([
            'user' => [
                'name' => $guru->nama,
                'nip' => $guru->nip,
                'jabatan' => $guru->jabatan ?? 'Guru',
                'foto_url' => $guru->foto ? asset('storage/' . $guru->foto) : null,
                'ttd_url' => $guru->ttd ? asset('storage/' . $guru->ttd) : null,
            ],
            'today' => [
                'date' => $today->locale('id')->translatedFormat('l, d F Y'),
                'scheduleCount' => $todaySchedule->count(), // Only count mengajar
            ],
            'stats' => $stats,
            'reminders' => $reminders,
        ]);
    }

    /**
     * Get day name in Indonesian
     */
    private function getDayName(int $dayOfWeek): string
    {
        $days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        return $days[$dayOfWeek];
    }

    /**
     * Determine schedule status based on time
     */
    private function getScheduleStatus(string $startTime, string $endTime, string $currentTime, bool $attended): string
    {
        if ($attended) {
            return 'attended';
        }

        $start = Carbon::createFromFormat('H:i', substr($startTime, 0, 5));
        $end = Carbon::createFromFormat('H:i', substr($endTime, 0, 5));
        $now = Carbon::createFromFormat('H:i', $currentTime);

        if ($now->lt($start)) {
            return 'upcoming';
        } elseif ($now->gte($start) && $now->lte($end)) {
            return 'ongoing';
        } else {
            return 'missed';
        }
    }

    /**
     * Generate reminders based on schedule status
     */
    private function generateReminders($schedule, $activities, $meetings, $currentTime)
    {
        $reminders = [];

        // Check missed teaching schedules
        foreach ($schedule as $item) {
            if ($item['status'] === 'sedang_berlangsung' || $item['status'] === 'terlewat') {
                $reminders[] = [
                    'type' => 'mengajar',
                    'title' => 'Belum Absen Mengajar',
                    'description' => "{$item['subject']} - {$item['class']} ({$item['time']})",
                    'priority' => $item['status'] === 'terlewat' ? 'high' : 'medium',
                ];
            }
        }

        // Check missed activities
        foreach ($activities as $item) {
            if ($item['status'] === 'sedang_berlangsung' || $item['status'] === 'terlewat') {
                $reminders[] = [
                    'type' => 'kegiatan',
                    'title' => 'Belum Absen Kegiatan',
                    'description' => "{$item['name']} ({$item['time']})",
                    'priority' => $item['status'] === 'terlewat' ? 'high' : 'medium',
                ];
            }
        }

        // Check missed/ongoing rapat
        foreach ($meetings as $item) {
            if ($item['status'] === 'sedang_berlangsung' || $item['status'] === 'terlewat') {
                $reminders[] = [
                    'type' => 'rapat',
                    'title' => 'Belum Absen Rapat',
                    'description' => "{$item['name']} - {$item['location']} ({$item['time']})",
                    'priority' => $item['status'] === 'terlewat' ? 'high' : 'medium',
                ];
            }
        }

        // Check upcoming meetings (in next 30 minutes)
        $now = Carbon::createFromFormat('H:i', $currentTime);
        foreach ($meetings as $item) {
            if ($item['status'] === 'belum_mulai') {
                $meetingStart = Carbon::createFromFormat('H:i', $item['time']);
                $diffMinutes = $now->diffInMinutes($meetingStart, false);

                if ($diffMinutes > 0 && $diffMinutes <= 30) {
                    $reminders[] = [
                        'type' => 'rapat',
                        'title' => "Rapat Dimulai {$diffMinutes} Menit Lagi",
                        'description' => "{$item['name']} - {$item['location']} ({$item['time']})",
                        'priority' => 'medium',
                        'countdown' => $diffMinutes,
                    ];
                }
            }
        }

        // Find next schedule
        foreach ($schedule as $item) {
            if ($item['status'] === 'belum_mulai') {
                $reminders[] = [
                    'type' => 'next',
                    'title' => 'Jadwal Mengajar Berikutnya',
                    'description' => "{$item['subject']} - {$item['class']} ({$item['time']})",
                    'priority' => 'low',
                ];
                break;
            }
        }

        return $reminders;
    }

    /**
     * Search across jadwal, kegiatan, rapat for the logged-in guru
     */
    public function search(Request $request)
    {
        $user = $request->user();
        $guru = $user->guru;
        $query = $request->input('q', '');
        $category = $request->input('category', 'all'); // all, jadwal, kegiatan, rapat
        $hari = $request->input('hari', '');

        if (strlen($query) < 2 && empty($hari)) {
            return response()->json([
                'results' => [],
                'total' => 0,
            ]);
        }

        $results = [];

        // Search Jadwal
        if ($category === 'all' || $category === 'jadwal') {
            $jadwalQuery = Jadwal::with(['mapel', 'kelas'])
                ->where('status', 'Aktif');

            // Only filter by guru if logged-in user has guru relation
            if ($guru) {
                $jadwalQuery->where('guru_id', $guru->id);
            }

            if (!empty($query)) {
                $jadwalQuery->where(function ($q) use ($query) {
                    $q->whereHas('mapel', function ($mq) use ($query) {
                        $mq->where('nama_mapel', 'like', "%{$query}%");
                    })->orWhereHas('kelas', function ($kq) use ($query) {
                        $kq->where('nama_kelas', 'like', "%{$query}%");
                    })->orWhere('hari', 'like', "%{$query}%");
                });
            }

            if (!empty($hari)) {
                $jadwalQuery->where('hari', $hari);
            }

            $today = Carbon::today();
            $todayHari = $today->translatedFormat('l'); // Hari dalam bahasa Indonesia

            $jadwal = $jadwalQuery->limit(10)->get()->map(function ($item) use ($todayHari) {
                $isToday = strtolower($item->hari) === strtolower($todayHari);
                return [
                    'id' => $item->id,
                    'type' => 'jadwal',
                    'title' => $item->mapel->nama_mapel ?? $item->mapel->nama ?? 'N/A',
                    'subtitle' => ($item->kelas->nama_kelas ?? $item->kelas->nama ?? 'N/A') . ' - ' . $item->hari,
                    'time' => substr($item->jam_mulai, 0, 5) . ' - ' . substr($item->jam_selesai, 0, 5),
                    'icon' => 'fa-chalkboard-teacher',
                    'color' => 'green',
                    // Additional fields for modal
                    'hari' => $item->hari,
                    'jam_mulai' => substr($item->jam_mulai, 0, 5),
                    'jam_selesai' => substr($item->jam_selesai, 0, 5),
                    'mapel' => $item->mapel->nama_mapel ?? 'N/A',
                    'kelas' => $item->kelas->nama_kelas ?? 'N/A',
                    'isToday' => $isToday,
                ];
            });

            $results = array_merge($results, $jadwal->toArray());
        }

        // Search Kegiatan - only where guru is PJ or pendamping
        if ($category === 'all' || $category === 'kegiatan') {
            $kegiatanQuery = Kegiatan::where('status', 'Aktif');

            // Filter by guru's role (PJ or pendamping)
            if ($guru) {
                $kegiatanQuery->where(function ($q) use ($guru) {
                    $q->where('penanggung_jawab_id', $guru->id)
                        ->orWhereJsonContains('guru_pendamping', $guru->id)
                        ->orWhereJsonContains('guru_pendamping', (string) $guru->id);
                });
            }

            if (!empty($query)) {
                $kegiatanQuery->where(function ($q) use ($query) {
                    $q->where('nama_kegiatan', 'like', "%{$query}%")
                        ->orWhere('tempat', 'like', "%{$query}%");
                });
            }

            $today = Carbon::today();

            $kegiatan = $kegiatanQuery->limit(10)->get()->map(function ($item) use ($guru, $today) {
                $isPJ = $guru && $item->penanggung_jawab_id == $guru->id;
                $time = 'N/A';
                $tanggal = null;
                $isToday = false;

                try {
                    if ($item->waktu_mulai) {
                        $waktuMulai = Carbon::parse($item->waktu_mulai);
                        $time = $waktuMulai->format('d M Y, H:i');
                        $tanggal = $waktuMulai->format('Y-m-d');
                        $isToday = $waktuMulai->isSameDay($today);
                    }
                } catch (\Exception $e) {
                    $time = 'N/A';
                }

                return [
                    'id' => $item->id,
                    'type' => 'kegiatan',
                    'title' => $item->nama_kegiatan,
                    'subtitle' => ($isPJ ? '[PJ] ' : '[Pendamping] ') . ($item->tempat ?? 'N/A'),
                    'time' => $time,
                    'icon' => 'fa-calendar-check',
                    'color' => 'blue',
                    // Additional fields for modal
                    'nama' => $item->nama_kegiatan,
                    'lokasi' => $item->tempat ?? 'N/A',
                    'tanggal' => $tanggal,
                    'waktu_mulai' => $item->waktu_mulai,
                    'waktu_selesai' => $item->waktu_selesai,
                    'role' => $isPJ ? 'PJ' : 'Pendamping',
                    'isToday' => $isToday,
                ];
            });

            $results = array_merge($results, $kegiatan->toArray());
        }

        // Search Rapat - only where guru is pimpinan, sekretaris, or peserta
        if ($category === 'all' || $category === 'rapat') {
            $rapatQuery = Rapat::where('status', 'Dijadwalkan');

            // Filter by guru's role
            if ($guru) {
                $rapatQuery->where(function ($q) use ($guru) {
                    $q->where('pimpinan_id', $guru->id)
                        ->orWhere('sekretaris_id', $guru->id)
                        ->orWhereJsonContains('peserta_rapat', $guru->id)
                        ->orWhereJsonContains('peserta_rapat', (string) $guru->id);
                });
            }

            if (!empty($query)) {
                $rapatQuery->where(function ($q) use ($query) {
                    $q->where('agenda_rapat', 'like', "%{$query}%")
                        ->orWhere('tempat', 'like', "%{$query}%")
                        ->orWhere('jenis_rapat', 'like', "%{$query}%");
                });
            }

            $today = Carbon::today();

            $rapat = $rapatQuery->limit(10)->get()->map(function ($item) use ($guru, $today) {
                // Determine role
                $role = 'Peserta';
                if ($guru) {
                    if ($item->pimpinan_id == $guru->id) {
                        $role = 'Pimpinan';
                    } elseif ($item->sekretaris_id == $guru->id) {
                        $role = 'Sekretaris';
                    }
                }

                $time = 'N/A';
                $tanggalStr = null;
                $isToday = false;

                try {
                    $tanggalDate = $item->tanggal instanceof \Carbon\Carbon
                        ? $item->tanggal
                        : (is_string($item->tanggal) ? Carbon::parse(substr($item->tanggal, 0, 10)) : null);

                    if ($tanggalDate) {
                        $tanggalStr = $tanggalDate->format('Y-m-d');
                        $time = $tanggalDate->format('d M Y') . ', ' . substr($item->waktu_mulai ?? '00:00', 0, 5);
                        $isToday = $tanggalDate->isSameDay($today);
                    }
                } catch (\Exception $e) {
                    $time = 'N/A';
                }

                return [
                    'id' => $item->id,
                    'type' => 'rapat',
                    'title' => $item->agenda_rapat,
                    'subtitle' => "[{$role}] " . ($item->jenis_rapat ?? 'Rapat') . ' - ' . ($item->tempat ?? 'N/A'),
                    'time' => $time,
                    'icon' => 'fa-users',
                    'color' => 'purple',
                    // Additional fields for modal
                    'nama' => $item->agenda_rapat,
                    'jenis' => $item->jenis_rapat ?? 'Rapat',
                    'lokasi' => $item->tempat ?? 'N/A',
                    'tanggal' => $tanggalStr,
                    'waktu_mulai' => substr($item->waktu_mulai ?? '00:00', 0, 5),
                    'waktu_selesai' => substr($item->waktu_selesai ?? '00:00', 0, 5),
                    'role' => $role,
                    'isToday' => $isToday,
                ];
            });

            $results = array_merge($results, $rapat->toArray());
        }

        // Search Absensi - based on jadwal (like Riwayat page)
        if ($category === 'all' || $category === 'absensi') {
            // Get jadwal for this guru
            $jadwalQuery = Jadwal::with(['mapel', 'kelas'])
                ->where('status', 'aktif');

            if ($guru) {
                $jadwalQuery->where('guru_id', $guru->id);
            }

            if (!empty($query)) {
                $jadwalQuery->where(function ($q) use ($query) {
                    $q->whereHas('mapel', function ($mq) use ($query) {
                        $mq->where('nama_mapel', 'like', "%{$query}%");
                    })->orWhereHas('kelas', function ($kq) use ($query) {
                        $kq->where('nama_kelas', 'like', "%{$query}%");
                    });
                });
            }

            $jadwalList = $jadwalQuery->limit(10)->get();

            // Map days to Carbon day numbers
            $dayMap = [
                'Senin' => Carbon::MONDAY,
                'Selasa' => Carbon::TUESDAY,
                'Rabu' => Carbon::WEDNESDAY,
                'Kamis' => Carbon::THURSDAY,
                'Jumat' => Carbon::FRIDAY,
                'Sabtu' => Carbon::SATURDAY,
                'Minggu' => Carbon::SUNDAY,
            ];

            $absensiResults = [];
            $today = Carbon::now('Asia/Jakarta');
            $thirtyDaysAgo = Carbon::now('Asia/Jakarta')->subDays(30)->startOfDay();

            // Get existing absensi records
            $jadwalIds = $jadwalList->pluck('id')->toArray();
            $existingAbsensi = AbsensiMengajar::whereIn('jadwal_id', $jadwalIds)
                ->where('tanggal', '>=', $thirtyDaysAgo)
                ->get()
                ->keyBy(function ($item) {
                    return $item->jadwal_id . '-' . Carbon::parse($item->tanggal)->format('Y-m-d');
                });

            foreach ($jadwalList as $jadwal) {
                $dayNumber = $dayMap[$jadwal->hari] ?? null;
                if ($dayNumber === null)
                    continue;

                // Find most recent occurrence
                $checkDate = $today->copy();
                while ($checkDate->dayOfWeek !== $dayNumber) {
                    $checkDate->subDay();
                }

                // Check if has passed
                $endTime = Carbon::parse($checkDate->format('Y-m-d') . ' ' . $jadwal->jam_selesai, 'Asia/Jakarta');
                if ($endTime->gt($today)) {
                    $checkDate->subWeek();
                }

                if ($checkDate->lt($thirtyDaysAgo))
                    continue;

                $key = $jadwal->id . '-' . $checkDate->format('Y-m-d');
                $absensi = $existingAbsensi->get($key);

                $guruStatus = $absensi ? ($absensi->guru_status ?? 'H') : 'A';
                $statusText = $guruStatus === 'H' ? 'Hadir' : ($guruStatus === 'I' ? 'Izin' : 'Alpha');

                $absensiResults[] = [
                    'id' => $absensi ? $absensi->id : $jadwal->id,
                    'type' => 'absensi',
                    'title' => ($jadwal->mapel->nama_mapel ?? 'N/A') . ' - ' . ($jadwal->kelas->nama_kelas ?? 'N/A'),
                    'subtitle' => '[Mengajar] Status: ' . $statusText,
                    'time' => $checkDate->translatedFormat('d M Y') . ', ' . substr($jadwal->jam_mulai, 0, 5),
                    'icon' => 'fa-clipboard-check',
                    'color' => 'orange',
                ];
            }

            // Also search Kegiatan records (similar to riwayat)
            $kegiatanQuery = Kegiatan::with('absensiKegiatan')
                ->whereNotNull('waktu_mulai');

            if ($guru) {
                $kegiatanQuery->where(function ($q) use ($guru) {
                    $q->where('penanggung_jawab_id', $guru->id)
                        ->orWhereJsonContains('guru_pendamping', $guru->id)
                        ->orWhereJsonContains('guru_pendamping', (string) $guru->id);
                });
            }
            if (!empty($query)) {
                $kegiatanQuery->where('nama_kegiatan', 'like', "%{$query}%");
            }

            $kegiatanList = $kegiatanQuery->orderBy('waktu_mulai', 'desc')->limit(10)->get();

            foreach ($kegiatanList as $kegiatan) {
                // Check if this kegiatan has ended
                try {
                    $waktuMulai = Carbon::parse($kegiatan->waktu_mulai);
                    if ($waktuMulai->gt($today))
                        continue; // Skip future kegiatan
                } catch (\Exception $e) {
                    continue;
                }

                // Get absensi record (absensiKegiatan is a collection, need first())
                $absensiKeg = $kegiatan->absensiKegiatan->first() ?? AbsensiKegiatan::where('kegiatan_id', $kegiatan->id)->first();
                $isPJ = $guru && $kegiatan->penanggung_jawab_id == $guru->id;

                $status = 'Alpha';
                if ($absensiKeg) {
                    if ($isPJ) {
                        $pjStatus = $absensiKeg->pj_status ?? 'A';
                        $status = $pjStatus === 'H' ? 'Hadir' : ($pjStatus === 'I' ? 'Izin' : 'Alpha');
                    } else {
                        $pendampingAbsensi = $absensiKeg->absensi_pendamping ?? [];
                        foreach ($pendampingAbsensi as $entry) {
                            if (($entry['guru_id'] ?? null) == $guru->id) {
                                $entryStatus = $entry['status'] ?? 'A';
                                $status = $entryStatus === 'H' ? 'Hadir' : ($entryStatus === 'I' ? 'Izin' : 'Alpha');
                                break;
                            }
                        }
                    }
                }

                $role = $isPJ ? 'PJ' : 'Pendamping';
                $time = 'N/A';
                try {
                    $time = Carbon::parse($kegiatan->waktu_mulai)->format('d M Y, H:i');
                } catch (\Exception $e) {
                }

                $absensiResults[] = [
                    'id' => $kegiatan->id,
                    'type' => 'absensi',
                    'title' => $kegiatan->nama_kegiatan,
                    'subtitle' => "[Kegiatan - {$role}] Status: " . $status,
                    'time' => $time,
                    'icon' => 'fa-calendar-check',
                    'color' => 'orange',
                ];
            }

            // Also search Rapat records (similar to riwayat)
            $rapatQuery = Rapat::with('absensiRapat')
                ->whereNotNull('tanggal');

            if ($guru) {
                $rapatQuery->where(function ($q) use ($guru) {
                    $q->where('pimpinan_id', $guru->id)
                        ->orWhere('sekretaris_id', $guru->id)
                        ->orWhereJsonContains('peserta_rapat', $guru->id)
                        ->orWhereJsonContains('peserta_rapat', (string) $guru->id);
                });
            }
            if (!empty($query)) {
                $rapatQuery->where(function ($q) use ($query) {
                    $q->where('agenda_rapat', 'like', "%{$query}%")
                        ->orWhere('jenis_rapat', 'like', "%{$query}%");
                });
            }

            $rapatList = $rapatQuery->orderBy('tanggal', 'desc')->limit(10)->get();

            foreach ($rapatList as $rapat) {
                // Check if rapat has started (not future)
                try {
                    $tanggal = $rapat->tanggal instanceof Carbon
                        ? $rapat->tanggal->format('Y-m-d')
                        : substr($rapat->tanggal, 0, 10);
                    $rapatDate = Carbon::parse($tanggal);
                    if ($rapatDate->gt($today))
                        continue; // Skip future rapat
                } catch (\Exception $e) {
                    continue;
                }


                $absensiRapat = $rapat->absensiRapat->first() ?? AbsensiRapat::where('rapat_id', $rapat->id)->first();
                $isPimpinan = $guru && $rapat->pimpinan_id == $guru->id;
                $isSekretaris = $guru && $rapat->sekretaris_id == $guru->id;

                $status = 'Alpha';
                $role = 'Peserta';

                if ($isPimpinan) {
                    $role = 'Pimpinan';
                    if ($absensiRapat) {
                        $pimpinanStatus = $absensiRapat->pimpinan_status ?? 'A';
                        $status = $pimpinanStatus === 'H' ? 'Hadir' : ($pimpinanStatus === 'I' ? 'Izin' : 'Alpha');
                    }
                } elseif ($isSekretaris) {
                    $role = 'Sekretaris';
                    if ($absensiRapat) {
                        $sekretarisStatus = $absensiRapat->sekretaris_status ?? 'A';
                        $status = $sekretarisStatus === 'H' ? 'Hadir' : ($sekretarisStatus === 'I' ? 'Izin' : 'Alpha');
                    }
                } else {
                    if ($absensiRapat) {
                        $pesertaAbsensi = $absensiRapat->absensi_peserta ?? [];
                        foreach ($pesertaAbsensi as $entry) {
                            if (($entry['guru_id'] ?? null) == $guru->id) {
                                $entryStatus = $entry['status'] ?? 'A';
                                $status = $entryStatus === 'H' ? 'Hadir' : ($entryStatus === 'I' ? 'Izin' : 'Alpha');
                                break;
                            }
                        }
                    }
                }

                $time = 'N/A';
                try {
                    $time = Carbon::parse($tanggal)->format('d M Y') . ', ' . substr($rapat->waktu_mulai, 0, 5);
                } catch (\Exception $e) {
                }

                $absensiResults[] = [
                    'id' => $rapat->id,
                    'type' => 'absensi',
                    'title' => $rapat->agenda_rapat,
                    'subtitle' => "[Rapat - {$role}] Status: " . $status,
                    'time' => $time,
                    'icon' => 'fa-users',
                    'color' => 'orange',
                ];
            }

            $results = array_merge($results, $absensiResults);
        }

        return response()->json([
            'results' => $results,
            'total' => count($results),
            'query' => $query,
        ]);
    }

    /**
     * Get profile data for the logged-in guru
     */
    public function profile(Request $request)
    {
        $user = $request->user();
        $guru = $user->guru;

        if (!$guru) {
            return response()->json([
                'user' => [
                    'name' => $user->name,
                    'email' => $user->email,
                    'nip' => '-',
                    'jabatan' => $user->role ?? 'User',
                    'jenis_kelamin' => '-',
                    'tempat_lahir' => '-',
                    'tanggal_lahir' => '-',
                    'alamat' => '-',
                    'pendidikan' => '-',
                    'kontak' => '-',
                ],
            ]);
        }

        return response()->json([
            'user' => [
                'name' => $guru->nama,
                'email' => $guru->email ?? $user->email,
                'nip' => $guru->nip ?? '-',
                'sk' => $guru->sk ?? '-',
                'jabatan' => $guru->jabatan ?? 'Guru',
                'jenis_kelamin' => $guru->jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan',
                'jenis_kelamin_raw' => $guru->jenis_kelamin,
                'tempat_lahir' => $guru->tempat_lahir ?? '-',
                'tanggal_lahir' => $guru->tanggal_lahir ? $guru->tanggal_lahir->format('d F Y') : '-',
                'tanggal_lahir_raw' => $guru->tanggal_lahir ? $guru->tanggal_lahir->format('Y-m-d') : '',
                'alamat' => $guru->alamat ?? '-',
                'pendidikan' => $guru->pendidikan ?? '-',
                'kontak' => $guru->kontak ?? '-',
                'tmt' => $guru->tmt ? $guru->tmt->format('d F Y') : '-',
                'status' => $guru->status ?? 'Aktif',
                'foto_url' => $guru->foto ? asset('storage/' . $guru->foto) : null,
                'ttd_url' => $guru->ttd ? asset('storage/' . $guru->ttd) : null,
            ],
        ]);
    }

    /**
     * Update profile data for the logged-in guru
     */
    public function updateProfile(Request $request)
    {
        $user = $request->user();
        $guru = $user->guru;

        if (!$guru) {
            return response()->json(['error' => 'Data guru tidak ditemukan'], 404);
        }

        $validated = $request->validate([
            'nama' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255|unique:guru,email,' . $guru->id,
            'kontak' => 'nullable|string|max:50',
            'alamat' => 'nullable|string|max:500',
            'tempat_lahir' => 'nullable|string|max:100',
            'tanggal_lahir' => 'nullable|date',
            'pendidikan' => 'nullable|string|max:100',
            'jenis_kelamin' => 'nullable|in:L,P',
        ]);

        // Only update provided fields
        $updateData = [];
        foreach (['nama', 'email', 'kontak', 'alamat', 'tempat_lahir', 'tanggal_lahir', 'pendidikan', 'jenis_kelamin'] as $field) {
            if (array_key_exists($field, $validated)) {
                $updateData[$field] = $validated[$field];
            }
        }

        if (!empty($updateData)) {
            $guru->update($updateData);

            // Also update user name if nama changed
            if (isset($updateData['nama'])) {
                $user->update(['name' => $updateData['nama']]);
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Profil berhasil diperbarui',
        ]);
    }

    /**
     * Get upcoming events for next 7 days
     */
    public function upcomingEvents(Request $request)
    {
        $user = $request->user();
        $guru = $user->guru;

        if (!$guru) {
            return response()->json(['events' => []]);
        }

        $today = Carbon::today();
        $endDate = Carbon::today()->addDays(7);

        // Get active tahun ajaran
        $tahunAjaran = TahunAjaran::where('is_active', true)->first();

        $events = [];

        // 1. Get jadwal (mengajar) for next 7 days based on day of week
        if ($tahunAjaran) {
            $jadwals = Jadwal::with(['mapel', 'kelas'])
                ->where('guru_id', $guru->id)
                ->where('tahun_ajaran_id', $tahunAjaran->id)
                ->get();

            // Loop through next 7 days
            for ($date = $today->copy(); $date->lte($endDate); $date->addDay()) {
                $dayName = $this->getDayName($date->dayOfWeek);

                foreach ($jadwals as $jadwal) {
                    if ($jadwal->hari === $dayName) {
                        $events[] = [
                            'type' => 'mengajar',
                            'title' => $jadwal->mapel->nama ?? 'Mengajar',
                            'subtitle' => $jadwal->kelas->nama_kelas ?? '',
                            'date' => $date->locale('id')->translatedFormat('l, d M'),
                            'date_raw' => $date->toDateString(),
                            'time' => substr($jadwal->jam_mulai, 0, 5) . ' - ' . substr($jadwal->jam_selesai, 0, 5),
                            'sort_key' => $date->toDateString() . ' ' . $jadwal->jam_mulai,
                        ];
                    }
                }
            }
        }

        // 2. Get kegiatan for next 7 days
        $kegiatanQuery = Kegiatan::where('status', 'Aktif')
            ->where(function ($q) use ($today, $endDate) {
                $q->whereBetween('waktu_mulai', [$today, $endDate])
                    ->orWhereBetween('waktu_berakhir', [$today, $endDate])
                    ->orWhere(function ($q2) use ($today, $endDate) {
                        $q2->where('waktu_mulai', '<=', $today)
                            ->where('waktu_berakhir', '>=', $endDate);
                    });
            });

        $kegiatans = $kegiatanQuery->get();

        foreach ($kegiatans as $kegiatan) {
            // Check if this guru is related: penanggung_jawab_id OR in guru_pendamping array
            $guruPendamping = $kegiatan->guru_pendamping ?? [];
            $isRelated = $kegiatan->penanggung_jawab_id == $guru->id ||
                in_array($guru->id, $guruPendamping);

            if ($isRelated) {
                $events[] = [
                    'type' => 'kegiatan',
                    'title' => $kegiatan->nama_kegiatan ?? $kegiatan->nama ?? 'Kegiatan',
                    'subtitle' => $kegiatan->tempat ?? '',
                    'date' => Carbon::parse($kegiatan->waktu_mulai)->locale('id')->translatedFormat('l, d M'),
                    'date_raw' => $kegiatan->waktu_mulai ? Carbon::parse($kegiatan->waktu_mulai)->toDateString() : null,
                    'time' => $kegiatan->waktu_mulai ? Carbon::parse($kegiatan->waktu_mulai)->format('H:i') : null,
                    'sort_key' => ($kegiatan->waktu_mulai ? Carbon::parse($kegiatan->waktu_mulai)->toDateTimeString() : '9999-12-31'),
                ];
            }
        }

        // 3. Get rapat for next 7 days
        $rapatQuery = Rapat::where('status', 'Aktif')
            ->whereBetween('tanggal', [$today, $endDate]);

        $rapats = $rapatQuery->get();

        foreach ($rapats as $rapat) {
            // Check if this guru is related (pimpinan, sekretaris, notulis, or in peserta_rapat array)
            $pesertaRapat = $rapat->peserta_rapat ?? [];
            $isRelated = $rapat->pimpinan_id == $guru->id ||
                $rapat->sekretaris_id == $guru->id ||
                $rapat->notulis_id == $guru->id ||
                in_array($guru->id, $pesertaRapat);

            if ($isRelated) {
                $events[] = [
                    'type' => 'rapat',
                    'title' => $rapat->agenda_rapat ?? $rapat->nama ?? 'Rapat',
                    'subtitle' => $rapat->tempat ?? '',
                    'date' => Carbon::parse($rapat->tanggal)->locale('id')->translatedFormat('l, d M'),
                    'date_raw' => $rapat->tanggal,
                    'time' => $rapat->waktu_mulai ? substr($rapat->waktu_mulai, 0, 5) : null,
                    'sort_key' => $rapat->tanggal . ' ' . ($rapat->waktu_mulai ?? '00:00:00'),
                ];
            }
        }

        // Sort by type priority (rapat=1, kegiatan=2, mengajar=3) then by date/time
        $typePriority = ['rapat' => 1, 'kegiatan' => 2, 'mengajar' => 3];
        usort($events, function ($a, $b) use ($typePriority) {
            $priorityA = $typePriority[$a['type']] ?? 99;
            $priorityB = $typePriority[$b['type']] ?? 99;
            if ($priorityA !== $priorityB) {
                return $priorityA - $priorityB;
            }
            return strcmp($a['sort_key'], $b['sort_key']);
        });

        // Remove sort_key from output and limit to 10 items
        $events = array_map(function ($event) {
            unset($event['sort_key']);
            return $event;
        }, array_slice($events, 0, 10));

        return response()->json(['events' => $events]);
    }

    /**
     * Upload profile photo
     */
    public function uploadPhoto(Request $request)
    {
        $request->validate([
            'photo' => 'required|image|mimes:jpeg,png,jpg,gif|max:2048'
        ]);

        $user = $request->user();
        $guru = $user->guru;

        if (!$guru) {
            return response()->json(['message' => 'Data guru tidak ditemukan'], 404);
        }

        try {
            // Delete old photo if exists
            if ($guru->foto && \Storage::disk('public')->exists($guru->foto)) {
                \Storage::disk('public')->delete($guru->foto);
            }

            // Compress and store new photo using ImageService
            $file = $request->file('photo');
            $filename = 'guru_' . $guru->id . '_' . time() . '.jpg';
            $path = \App\Services\ImageService::compressAndStore($file, 'photos/guru', $filename);

            if (!$path) {
                return response()->json(['message' => 'Gagal memproses foto'], 500);
            }

            // Update guru with new photo path
            $guru->update(['foto' => $path]);

            return response()->json([
                'success' => true,
                'message' => 'Foto profil berhasil diperbarui',
                'photo_url' => asset('storage/' . $path)
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Gagal mengupload foto: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Upload signature (TTD) image
     */
    public function uploadTtd(Request $request)
    {
        $user = $request->user();
        $guru = $user->guru;

        if (!$guru) {
            return response()->json(['message' => 'Data guru tidak ditemukan'], 404);
        }

        // Accept either file upload or base64
        if (!$request->hasFile('ttd') && !$request->input('ttd_base64')) {
            return response()->json(['message' => 'TTD file atau base64 data diperlukan'], 422);
        }

        try {
            // Delete old TTD if exists
            if ($guru->ttd && \Storage::disk('public')->exists($guru->ttd)) {
                \Storage::disk('public')->delete($guru->ttd);
            }

            if ($request->input('ttd_base64')) {
                // Handle base64 canvas data
                $base64 = $request->input('ttd_base64');
                $base64 = preg_replace('/^data:image\/\w+;base64,/', '', $base64);
                $imageData = base64_decode($base64);
                if (!$imageData) {
                    return response()->json(['message' => 'Data base64 tidak valid'], 422);
                }
                $filename = 'ttd_' . $guru->id . '_' . time() . '.png';
                $path = 'ttd/guru/' . $filename;
                \Storage::disk('public')->put($path, $imageData);
            } else {
                // Handle file upload
                $request->validate([
                    'ttd' => 'required|image|mimes:jpeg,png,jpg,gif|max:2048'
                ]);
                $file = $request->file('ttd');
                $extension = $file->getClientOriginalExtension() ?: 'png';
                $filename = 'ttd_' . $guru->id . '_' . time() . '.' . $extension;
                $path = $file->storeAs('ttd/guru', $filename, 'public');
            }

            if (!$path) {
                return response()->json(['message' => 'Gagal menyimpan TTD'], 500);
            }

            // Update guru with new TTD path
            $guru->update(['ttd' => $path]);

            return response()->json([
                'success' => true,
                'message' => 'Tanda tangan berhasil diperbarui',
                'ttd_url' => asset('storage/' . $path)
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Gagal mengupload TTD: ' . $e->getMessage()], 500);
        }
    }
    /**
     * Get wali kelas info for the logged-in guru
     */
    public function waliKelasInfo(Request $request)
    {
        $user = $request->user();
        $guru = $user->guru;

        if (!$guru) {
            return response()->json(['success' => false, 'data' => null]);
        }

        $tahunAjaran = TahunAjaran::where('is_active', true)->first();
        if (!$tahunAjaran) {
            return response()->json(['success' => false, 'data' => null]);
        }

        $kelas = \App\Models\Kelas::where('wali_kelas_id', $guru->id)
            ->where('tahun_ajaran_id', $tahunAjaran->id)
            ->where('status', 'Aktif')
            ->first();

        if (!$kelas) {
            return response()->json(['success' => false, 'data' => null]);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'kelas_id' => $kelas->id,
                'nama_kelas' => $kelas->nama_kelas,
                'jumlah_siswa' => $kelas->jumlah_siswa,
            ],
        ]);
    }
}
