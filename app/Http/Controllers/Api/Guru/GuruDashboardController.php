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

        // Calculate REAL monthly statistics
        $startOfMonth = Carbon::now('Asia/Jakarta')->startOfMonth();
        $endOfMonth = Carbon::now('Asia/Jakarta')->endOfMonth();
        $today = Carbon::now('Asia/Jakarta')->startOfDay();

        // ============ STATS MENGAJAR ============
        // Get all jadwal for this guru
        $guruJadwal = Jadwal::where('guru_id', $guru->id)
            ->where('status', 'Aktif')
            ->get();

        // Calculate all teaching dates this month based on jadwal
        $mengajarTotal = 0;
        $mengajarHadir = 0;
        $mengajarIzin = 0;
        $mengajarAlpha = 0;

        $dayMapping = [
            'Minggu' => 0, 'Senin' => 1, 'Selasa' => 2, 'Rabu' => 3,
            'Kamis' => 4, 'Jumat' => 5, 'Sabtu' => 6
        ];

        foreach ($guruJadwal as $jadwal) {
            $dayOfWeek = $dayMapping[$jadwal->hari] ?? null;
            if ($dayOfWeek === null) continue;

            // Find all dates of this day in current month up to today
            $currentDate = $startOfMonth->copy();
            while ($currentDate->lte($today) && $currentDate->lte($endOfMonth)) {
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
        $kegiatanThisMonth = Kegiatan::where(function ($q) use ($guru) {
            $q->where('penanggung_jawab_id', $guru->id)
                ->orWhereJsonContains('guru_pendamping', $guru->id)
                ->orWhereJsonContains('guru_pendamping', (string) $guru->id);
        })
            ->whereBetween('waktu_mulai', [$startOfMonth, $endOfMonth])
            ->where('waktu_berakhir', '<=', Carbon::now('Asia/Jakarta'))
            ->get();

        $kegiatanTotal = $kegiatanThisMonth->count();
        $kegiatanHadir = 0;
        $kegiatanIzin = 0;
        $kegiatanAlpha = 0;

        foreach ($kegiatanThisMonth as $kegiatan) {
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
                    // Check pendamping status
                    $pendampingAbsensi = $absensiKeg->absensi_pendamping ?? [];
                    foreach ($pendampingAbsensi as $entry) {
                        if ($entry['guru_id'] == $guru->id) {
                            if (!empty($entry['self_attended'])) {
                                if (isset($entry['status']) && $entry['status'] === 'I') {
                                    $izin = true;
                                } else {
                                    $attended = true;
                                }
                            } elseif (isset($entry['status']) && $entry['status'] === 'I') {
                                $izin = true;
                            }
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
        $rapatThisMonth = Rapat::where(function ($q) use ($guru) {
            $q->where('pimpinan_id', $guru->id)
                ->orWhere('sekretaris_id', $guru->id)
                ->orWhereJsonContains('peserta_rapat', $guru->id)
                ->orWhereJsonContains('peserta_rapat', (string) $guru->id);
        })
            ->whereBetween('tanggal', [$startOfMonth, $endOfMonth])
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

        $rapatTotal = $rapatThisMonth->count();
        $rapatHadir = 0;
        $rapatIzin = 0;
        $rapatAlpha = 0;

        foreach ($rapatThisMonth as $rapat) {
            $absensiRapat = \App\Models\AbsensiRapat::where('rapat_id', $rapat->id)->first();
            $isPimpinan = $rapat->pimpinan_id == $guru->id;
            $isSekretaris = $rapat->sekretaris_id == $guru->id;
            $attended = false;
            $izin = false;

            if ($absensiRapat) {
                if ($isPimpinan) {
                    if ($absensiRapat->pimpinan_self_attended) {
                        if ($absensiRapat->pimpinan_status === 'I') {
                            $izin = true;
                        } else {
                            $attended = true;
                        }
                    } elseif ($absensiRapat->pimpinan_status === 'I') {
                        $izin = true;
                    }
                } elseif ($isSekretaris) {
                    if ($absensiRapat->status === 'submitted') {
                        if ($absensiRapat->sekretaris_status === 'I') {
                            $izin = true;
                        } else {
                            $attended = true;
                        }
                    }
                } else {
                    // Check peserta array
                    $pesertaAbsensi = $absensiRapat->absensi_peserta ?? [];
                    foreach ($pesertaAbsensi as $entry) {
                        if (isset($entry['guru_id']) && $entry['guru_id'] == $guru->id) {
                            if (!empty($entry['self_attended'])) {
                                if (isset($entry['status']) && $entry['status'] === 'I') {
                                    $izin = true;
                                } else {
                                    $attended = true;
                                }
                            } elseif (isset($entry['status']) && $entry['status'] === 'I') {
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
                if ($dayNumber === null) continue;

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

                if ($checkDate->lt($thirtyDaysAgo)) continue;

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
                    if ($waktuMulai->gt($today)) continue; // Skip future kegiatan
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
                } catch (\Exception $e) {}

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
                    if ($rapatDate->gt($today)) continue; // Skip future rapat
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
                } catch (\Exception $e) {}

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
                'tempat_lahir' => $guru->tempat_lahir ?? '-',
                'tanggal_lahir' => $guru->tanggal_lahir ? $guru->tanggal_lahir->format('d F Y') : '-',
                'alamat' => $guru->alamat ?? '-',
                'pendidikan' => $guru->pendidikan ?? '-',
                'kontak' => $guru->kontak ?? '-',
                'tmt' => $guru->tmt ? $guru->tmt->format('d F Y') : '-',
                'status' => $guru->status ?? 'Aktif',
            ],
        ]);
    }
}
