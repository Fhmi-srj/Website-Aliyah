<?php

namespace App\Http\Controllers\Api\Guru;

use App\Http\Controllers\Controller;
use App\Models\Jadwal;
use App\Models\Kegiatan;
use App\Models\Rapat;
use App\Models\Guru;
use App\Models\AbsensiKegiatan;
use App\Models\AbsensiMengajar;
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

                // Check attendance status
                $absensiRapat = \App\Models\AbsensiRapat::where('rapat_id', $rapat->id)->first();
                $statusAbsensi = $this->getScheduleStatus($rapat->waktu_mulai, $rapat->waktu_selesai, $currentTime, false);

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

        // Calculate statistics (mock for now - will integrate with absensi table later)
        $stats = [
            'totalMengajar' => $todaySchedule->count() * 20, // Approximate monthly
            'hadir' => round($todaySchedule->count() * 20 * 0.93),
            'izin' => round($todaySchedule->count() * 20 * 0.04),
            'sakit' => round($todaySchedule->count() * 20 * 0.03),
            'percentage' => 93,
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
                'scheduleCount' => $todaySchedule->count(),
            ],
            'todaySchedule' => $todaySchedule,
            'todayActivities' => $todayActivities,
            'todayMeetings' => $todayMeetings,
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
            if ($item['status'] === 'ongoing' || $item['status'] === 'missed') {
                $reminders[] = [
                    'type' => 'mengajar',
                    'title' => 'Belum Absen Mengajar',
                    'description' => "{$item['subject']} - {$item['class']} ({$item['time']})",
                    'priority' => $item['status'] === 'missed' ? 'high' : 'medium',
                ];
            }
        }

        // Check missed activities
        foreach ($activities as $item) {
            if ($item['status'] === 'ongoing' || $item['status'] === 'missed') {
                $reminders[] = [
                    'type' => 'kegiatan',
                    'title' => 'Belum Absen Kegiatan',
                    'description' => "{$item['name']} ({$item['time']})",
                    'priority' => $item['status'] === 'missed' ? 'high' : 'medium',
                ];
            }
        }

        // Check upcoming meetings (in next 30 minutes)
        $now = Carbon::createFromFormat('H:i', $currentTime);
        foreach ($meetings as $item) {
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

        // Find next schedule
        foreach ($schedule as $item) {
            if ($item['status'] === 'upcoming') {
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
                        $mq->where('nama', 'like', "%{$query}%");
                    })->orWhereHas('kelas', function ($kq) use ($query) {
                        $kq->where('nama', 'like', "%{$query}%");
                    })->orWhere('hari', 'like', "%{$query}%");
                });
            }

            if (!empty($hari)) {
                $jadwalQuery->where('hari', $hari);
            }

            $jadwal = $jadwalQuery->limit(10)->get()->map(function ($item) {
                return [
                    'id' => $item->id,
                    'type' => 'jadwal',
                    'title' => $item->mapel->nama ?? 'N/A',
                    'subtitle' => ($item->kelas->nama ?? 'N/A') . ' - ' . $item->hari,
                    'time' => substr($item->jam_mulai, 0, 5) . ' - ' . substr($item->jam_selesai, 0, 5),
                    'icon' => 'fa-chalkboard-teacher',
                    'color' => 'green',
                ];
            });

            $results = array_merge($results, $jadwal->toArray());
        }

        // Search Kegiatan
        if ($category === 'all' || $category === 'kegiatan') {
            $kegiatanQuery = Kegiatan::where('status', 'Aktif');

            if (!empty($query)) {
                $kegiatanQuery->where(function ($q) use ($query) {
                    $q->where('nama_kegiatan', 'like', "%{$query}%")
                        ->orWhere('tempat', 'like', "%{$query}%");
                });
            }

            $kegiatan = $kegiatanQuery->limit(10)->get()->map(function ($item) {
                return [
                    'id' => $item->id,
                    'type' => 'kegiatan',
                    'title' => $item->nama_kegiatan,
                    'subtitle' => $item->tempat ?? 'N/A',
                    'time' => Carbon::parse($item->waktu_mulai)->format('d M Y, H:i'),
                    'icon' => 'fa-calendar-check',
                    'color' => 'blue',
                ];
            });

            $results = array_merge($results, $kegiatan->toArray());
        }

        // Search Rapat
        if ($category === 'all' || $category === 'rapat') {
            $rapatQuery = Rapat::query();

            if (!empty($query)) {
                $rapatQuery->where(function ($q) use ($query) {
                    $q->where('agenda_rapat', 'like', "%{$query}%")
                        ->orWhere('tempat', 'like', "%{$query}%")
                        ->orWhere('jenis_rapat', 'like', "%{$query}%");
                });
            }

            $rapat = $rapatQuery->limit(10)->get()->map(function ($item) {
                return [
                    'id' => $item->id,
                    'type' => 'rapat',
                    'title' => $item->agenda_rapat,
                    'subtitle' => ($item->jenis_rapat ?? 'Rapat') . ' - ' . ($item->tempat ?? 'N/A'),
                    'time' => Carbon::parse($item->tanggal)->format('d M Y') . ', ' . substr($item->waktu_mulai, 0, 5),
                    'icon' => 'fa-users',
                    'color' => 'purple',
                ];
            });

            $results = array_merge($results, $rapat->toArray());
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
