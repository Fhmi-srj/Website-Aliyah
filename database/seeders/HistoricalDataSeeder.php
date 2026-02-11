<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Carbon\Carbon;

class HistoricalDataSeeder extends Seeder
{
    /**
     * Generate historical data for 2024/2025 academic year.
     * This creates a full year of:
     * - Absensi Mengajar (teaching attendance)
     * - Absensi Siswa (student attendance)
     * - Kegiatan with Absensi (activities with attendance)
     * - Rapat with Absensi (meetings with attendance)
     */
    public function run(): void
    {
        $this->command->info('Generating historical data for 2024/2025...');

        // Get references
        $guruList = DB::table('guru')->where('status', 'Aktif')->get();
        $siswaList = DB::table('siswa')->get();
        $jadwalList = DB::table('jadwal')->where('status', 'Aktif')->get();
        $kelasList = DB::table('kelas')->where('status', 'Aktif')->get();

        if ($guruList->isEmpty() || $siswaList->isEmpty()) {
            $this->command->warn('No guru or siswa found. Please run other seeders first.');
            return;
        }

        // Academic year 2024/2025: July 2024 - June 2025
        $startDate = Carbon::create(2024, 7, 14); // First Monday after July start
        $endDate = Carbon::create(2025, 6, 30);

        // Define school holidays (simplified)
        $holidays = [
            ['2024-08-17', '2024-08-17'], // Independence Day
            ['2024-12-23', '2025-01-05'], // Winter break
            ['2025-03-29', '2025-04-06'], // Spring break
            ['2025-05-01', '2025-05-01'], // Labor Day
        ];

        $isHoliday = function ($date) use ($holidays) {
            foreach ($holidays as $h) {
                if ($date >= $h[0] && $date <= $h[1])
                    return true;
            }
            return false;
        };

        // Generate teaching attendance and student attendance
        $this->generateAbsensiMengajar($jadwalList, $siswaList, $startDate, $endDate, $isHoliday);

        // Get 2024/2025 tahun ajaran for kegiatan and rapat
        $tahunAjaran2024 = DB::table('tahun_ajaran')->where('nama', '2024/2025')->first();
        $tahunAjaranId = $tahunAjaran2024?->id;

        // Generate historical kegiatan and attendance
        $this->generateHistoricalKegiatan($guruList, $siswaList, $kelasList, $startDate, $endDate, $tahunAjaranId);

        // Generate historical rapat and attendance
        $this->generateHistoricalRapat($guruList, $startDate, $endDate, $tahunAjaranId);

        $this->command->info('Historical data generation complete!');
    }

    private function generateAbsensiMengajar($jadwalList, $siswaList, $startDate, $endDate, $isHoliday)
    {
        $this->command->info('Generating absensi mengajar...');

        $currentDate = $startDate->copy();
        $count = 0;

        // Group siswa by kelas
        $siswaByKelas = $siswaList->groupBy('kelas_id');

        while ($currentDate <= $endDate) {
            // Skip weekends and holidays
            if ($currentDate->isWeekend() || $isHoliday($currentDate->format('Y-m-d'))) {
                $currentDate->addDay();
                continue;
            }

            $dayName = $currentDate->locale('id')->dayName;
            $dayMap = [
                'Senin' => 'Senin',
                'Monday' => 'Senin',
                'Selasa' => 'Selasa',
                'Tuesday' => 'Selasa',
                'Rabu' => 'Rabu',
                'Wednesday' => 'Rabu',
                'Kamis' => 'Kamis',
                'Thursday' => 'Kamis',
                'Jumat' => 'Jumat',
                'Friday' => 'Jumat',
            ];
            $hari = $dayMap[$dayName] ?? $dayName;

            // Get jadwal for this day
            $todayJadwal = $jadwalList->filter(fn($j) => $j->hari === $hari);

            foreach ($todayJadwal as $jadwal) {
                $status = $this->randomGuruStatus(95);
                $absensiMengajarId = DB::table('absensi_mengajar')->insertGetId([
                    'jadwal_id' => $jadwal->id,
                    'guru_id' => $jadwal->guru_id,
                    'tanggal' => $currentDate->format('Y-m-d'),
                    'ringkasan_materi' => 'Materi pembelajaran ' . $currentDate->format('d/m/Y'),
                    'berita_acara' => 'Kegiatan belajar mengajar berjalan lancar.',
                    'status' => $status,
                    'absensi_time' => $currentDate->copy()->setTime(7, 0),
                    'created_at' => $currentDate->copy()->setTime(7, 0),
                    'updated_at' => $currentDate->copy()->setTime(7, 0),
                ]);

                // Create absensi siswa for this class
                $classStudents = $siswaByKelas->get($jadwal->kelas_id, collect());
                $absensiSiswaData = [];

                foreach ($classStudents as $siswa) {
                    $absensiSiswaData[] = [
                        'absensi_mengajar_id' => $absensiMengajarId,
                        'siswa_id' => $siswa->id,
                        'status' => $this->randomStatus(90),
                        'keterangan' => null,
                        'created_at' => $currentDate->copy()->setTime(7, 0),
                        'updated_at' => $currentDate->copy()->setTime(7, 0),
                    ];
                }

                if (!empty($absensiSiswaData)) {
                    DB::table('absensi_siswa')->insert($absensiSiswaData);
                }

                $count++;
            }

            $currentDate->addDay();
        }

        $this->command->info("Generated $count absensi mengajar records with student attendance");
    }

    private function generateHistoricalKegiatan($guruList, $siswaList, $kelasList, $startDate, $endDate, $tahunAjaranId = null)
    {
        $this->command->info('Generating historical kegiatan...');

        $kegiatanTypes = [
            ['nama' => 'Upacara Bendera', 'jenis' => 'Rutin', 'tempat' => 'Lapangan Utama'],
            ['nama' => 'Kajian Jumat', 'jenis' => 'Rutin', 'tempat' => 'Aula Madrasah'],
            ['nama' => 'Muhadharah', 'jenis' => 'Rutin', 'tempat' => 'Aula Madrasah'],
            ['nama' => 'Lomba Tahfidz', 'jenis' => 'Insidental', 'tempat' => 'Aula Madrasah'],
            ['nama' => 'Peringatan Maulid Nabi', 'jenis' => 'Tahunan', 'tempat' => 'Aula Madrasah'],
        ];

        $currentDate = $startDate->copy();
        $kegiatanCount = 0;
        $kelasIds = $kelasList->pluck('id')->toArray();
        $guruIds = $guruList->pluck('id')->toArray();
        $siswaIds = $siswaList->pluck('id')->toArray();

        while ($currentDate <= $endDate) {
            // Monthly kegiatan (1st and 15th)
            if ($currentDate->day === 1 || $currentDate->day === 15) {
                $type = $kegiatanTypes[array_rand($kegiatanTypes)];
                $pjId = $guruIds[array_rand($guruIds)];
                $pj = $guruList->firstWhere('id', $pjId);

                // Select 2-4 pendamping
                $pendampingIds = collect($guruIds)
                    ->filter(fn($id) => $id != $pjId)
                    ->random(min(4, count($guruIds) - 1))
                    ->toArray();

                $kegiatanId = DB::table('kegiatan')->insertGetId([
                    'nama_kegiatan' => $type['nama'] . ' - ' . $currentDate->format('F Y'),
                    'jenis_kegiatan' => $type['jenis'],
                    'waktu_mulai' => $currentDate->copy()->setTime(8, 0),
                    'waktu_berakhir' => $currentDate->copy()->setTime(12, 0),
                    'tempat' => $type['tempat'],
                    'penanggung_jawab_id' => $pjId,
                    'penanggung_jawab' => $pj->nama,
                    'guru_pendamping' => json_encode($pendampingIds),
                    'peserta' => 'Semua Siswa',
                    'kelas_peserta' => json_encode($kelasIds),
                    'deskripsi' => 'Kegiatan ' . $type['nama'] . ' periode ' . $currentDate->format('F Y'),
                    'status' => 'Aktif',
                    'status_kbm' => 'Aktif',
                    'tahun_ajaran_id' => $tahunAjaranId,
                    'created_at' => $currentDate,
                    'updated_at' => $currentDate,
                ]);

                // Generate absensi kegiatan with correct table structure
                // absensi_kegiatan uses: pj_status, absensi_pendamping (JSON), absensi_siswa (JSON)
                $absensiPendamping = [];
                foreach ($pendampingIds as $pendId) {
                    $absensiPendamping[] = [
                        'guru_id' => $pendId,
                        'status' => $this->randomStatus(92),
                        'keterangan' => null,
                    ];
                }

                $absensiSiswa = [];
                foreach ($siswaIds as $siswaId) {
                    $absensiSiswa[] = [
                        'siswa_id' => $siswaId,
                        'status' => $this->randomStatus(90),
                        'keterangan' => null,
                    ];
                }

                DB::table('absensi_kegiatan')->insert([
                    'kegiatan_id' => $kegiatanId,
                    'tanggal' => $currentDate->format('Y-m-d'),
                    'penanggung_jawab_id' => $pjId,
                    'pj_status' => 'H',
                    'pj_keterangan' => null,
                    'absensi_pendamping' => json_encode($absensiPendamping),
                    'absensi_siswa' => json_encode($absensiSiswa),
                    'berita_acara' => 'Kegiatan berjalan dengan lancar dan tertib.',
                    'foto_kegiatan' => null,
                    'status' => 'submitted',
                    'created_at' => $currentDate,
                    'updated_at' => $currentDate,
                ]);

                $kegiatanCount++;
            }

            $currentDate->addDay();
        }

        $this->command->info("Generated $kegiatanCount historical kegiatan records");
    }

    private function generateHistoricalRapat($guruList, $startDate, $endDate, $tahunAjaranId = null)
    {
        $this->command->info('Generating historical rapat...');

        $rapatTypes = [
            ['agenda' => 'Rapat Koordinasi Mingguan', 'jenis' => 'Rutin'],
            ['agenda' => 'Rapat Evaluasi Bulanan', 'jenis' => 'Evaluasi'],
            ['agenda' => 'Rapat Wali Kelas', 'jenis' => 'Koordinasi'],
            ['agenda' => 'Rapat Persiapan Ujian', 'jenis' => 'Koordinasi'],
        ];

        $currentDate = $startDate->copy();
        $rapatCount = 0;
        $guruIds = $guruList->pluck('id')->toArray();

        while ($currentDate <= $endDate) {
            // Bi-weekly rapat on Monday
            if ($currentDate->dayOfWeek === Carbon::MONDAY && $currentDate->weekOfYear % 2 === 0) {
                $type = $rapatTypes[array_rand($rapatTypes)];

                $pimpinanId = $guruIds[array_rand($guruIds)];
                $pimpinan = $guruList->firstWhere('id', $pimpinanId);

                $availableIds = collect($guruIds)->filter(fn($id) => $id != $pimpinanId);
                $sekretarisId = $availableIds->random();
                $sekretaris = $guruList->firstWhere('id', $sekretarisId);

                $pesertaIds = $availableIds->filter(fn($id) => $id != $sekretarisId)->toArray();

                $rapatId = DB::table('rapat')->insertGetId([
                    'agenda_rapat' => $type['agenda'] . ' - ' . $currentDate->format('d M Y'),
                    'jenis_rapat' => $type['jenis'],
                    'pimpinan' => $pimpinan->nama,
                    'pimpinan_id' => $pimpinanId,
                    'sekretaris' => $sekretaris->nama,
                    'sekretaris_id' => $sekretarisId,
                    'peserta_rapat' => json_encode(array_values($pesertaIds)),
                    'tanggal' => $currentDate->format('Y-m-d'),
                    'waktu_mulai' => '09:00',
                    'waktu_selesai' => '11:00',
                    'tempat' => 'Ruang Rapat Utama',
                    'status' => 'Selesai',
                    'tahun_ajaran_id' => $tahunAjaranId,
                    'created_at' => $currentDate,
                    'updated_at' => $currentDate,
                ]);

                // Generate absensi rapat with correct table structure
                $absensiPeserta = [];
                foreach ($pesertaIds as $pesertaId) {
                    $absensiPeserta[] = [
                        'guru_id' => $pesertaId,
                        'status' => $this->randomStatus(88),
                        'keterangan' => null,
                        'self_attended' => rand(0, 1) === 1,
                        'attended_at' => $currentDate->copy()->setTime(9, rand(0, 15))->toIso8601String(),
                    ];
                }

                DB::table('absensi_rapat')->insert([
                    'rapat_id' => $rapatId,
                    'tanggal' => $currentDate->format('Y-m-d'),
                    'pimpinan_status' => 'H',
                    'pimpinan_keterangan' => null,
                    'pimpinan_self_attended' => true,
                    'pimpinan_attended_at' => $currentDate->copy()->setTime(8, 55),
                    'sekretaris_status' => 'H',
                    'sekretaris_keterangan' => null,
                    'absensi_peserta' => json_encode($absensiPeserta),
                    'notulensi' => 'Hasil rapat: ' . $type['agenda'] . '. Evaluasi dan rencana kerja telah dibahas.',
                    'foto_rapat' => null,
                    'status' => 'submitted',
                    'created_at' => $currentDate,
                    'updated_at' => $currentDate,
                ]);

                $rapatCount++;
            }

            $currentDate->addDay();
        }

        $this->command->info("Generated $rapatCount historical rapat records");
    }

    private function randomStatus($hadiProbability = 90)
    {
        $rand = rand(1, 100);
        if ($rand <= $hadiProbability) {
            return 'H';
        } elseif ($rand <= $hadiProbability + 5) {
            return 'I';
        } else {
            return 'A';
        }
    }

    private function randomGuruStatus($hadiProbability = 95)
    {
        return rand(1, 100) <= $hadiProbability ? 'hadir' : 'alpha';
    }
}
