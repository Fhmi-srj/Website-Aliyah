<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Carbon\Carbon;

class RapatSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Disable foreign key checks and clear existing data
        Schema::disableForeignKeyConstraints();
        DB::table('absensi_rapat')->truncate();
        DB::table('rapat')->truncate();
        Schema::enableForeignKeyConstraints();

        // Get guru IDs
        $guruList = DB::table('guru')->where('status', 'Aktif')->get();
        
        if ($guruList->isEmpty()) {
            $this->command->warn('No active teachers found. Please run GuruSeeder first.');
            return;
        }

        // Helper to get guru by name
        $getGuruByName = function($name) use ($guruList) {
            return $guruList->first(fn($g) => str_contains(strtolower($g->nama), strtolower($name)));
        };

        $guruAhmad = $getGuruByName('Ahmad') ?? $guruList[0] ?? null;
        $guruSiti = $getGuruByName('Siti') ?? $guruList[1] ?? null;
        $guruBudi = $getGuruByName('Budi') ?? $guruList[2] ?? null;
        $guruDewi = $getGuruByName('Dewi') ?? $guruList[3] ?? null;
        $guruRizky = $getGuruByName('Rizky') ?? $guruList[4] ?? null;
        $guruNur = $getGuruByName('Nur') ?? $guruList[5] ?? null;

        // All guru IDs for peserta
        $allGuruIds = $guruList->pluck('id')->toArray();
        
        // Base dates
        $today = Carbon::now();

        $data = [
            // Rapat Rutin - Koordinasi Mingguan
            [
                'agenda_rapat' => 'Rapat Koordinasi Mingguan',
                'jenis_rapat' => 'Rutin',
                'pimpinan' => $guruAhmad?->nama ?? 'Ahmad Fauzi',
                'pimpinan_id' => $guruAhmad?->id,
                'sekretaris' => $guruSiti?->nama ?? 'Siti Nurhaliza',
                'sekretaris_id' => $guruSiti?->id,
                'peserta_rapat' => json_encode(array_slice($allGuruIds, 0, 8)),
                'tanggal' => $today->copy()->next(Carbon::MONDAY)->format('Y-m-d'),
                'waktu_mulai' => '08:00',
                'waktu_selesai' => '10:00',
                'tempat' => 'Ruang Rapat Utama',
                'status' => 'Dijadwalkan',
            ],
            // Rapat Koordinasi - Evaluasi KBM
            [
                'agenda_rapat' => 'Evaluasi Kegiatan Belajar Mengajar',
                'jenis_rapat' => 'Koordinasi',
                'pimpinan' => $guruBudi?->nama ?? 'Budi Santoso',
                'pimpinan_id' => $guruBudi?->id,
                'sekretaris' => $guruDewi?->nama ?? 'Dewi Lestari',
                'sekretaris_id' => $guruDewi?->id,
                'peserta_rapat' => json_encode($allGuruIds),
                'tanggal' => $today->copy()->addDays(5)->format('Y-m-d'),
                'waktu_mulai' => '13:00',
                'waktu_selesai' => '15:00',
                'tempat' => 'Ruang Rapat 2',
                'status' => 'Dijadwalkan',
            ],
            // Rapat Evaluasi - Persiapan Ujian
            [
                'agenda_rapat' => 'Persiapan Ujian Akhir Semester',
                'jenis_rapat' => 'Evaluasi',
                'pimpinan' => $guruRizky?->nama ?? 'Rizky Ramadhan',
                'pimpinan_id' => $guruRizky?->id,
                'sekretaris' => $guruAhmad?->nama ?? 'Ahmad Fauzi',
                'sekretaris_id' => $guruAhmad?->id,
                'peserta_rapat' => json_encode(array_slice($allGuruIds, 0, 10)),
                'tanggal' => $today->copy()->addDays(10)->format('Y-m-d'),
                'waktu_mulai' => '09:00',
                'waktu_selesai' => '11:00',
                'tempat' => 'Ruang Rapat Utama',
                'status' => 'Dijadwalkan',
            ],
            // Rapat Koordinasi - Pengembangan Kurikulum
            [
                'agenda_rapat' => 'Pengembangan Kurikulum Pesantren',
                'jenis_rapat' => 'Koordinasi',
                'pimpinan' => $guruDewi?->nama ?? 'Dewi Lestari',
                'pimpinan_id' => $guruDewi?->id,
                'sekretaris' => $guruBudi?->nama ?? 'Budi Santoso',
                'sekretaris_id' => $guruBudi?->id,
                'peserta_rapat' => json_encode(array_slice($allGuruIds, 0, 6)),
                'tanggal' => $today->copy()->addDays(15)->format('Y-m-d'),
                'waktu_mulai' => '14:00',
                'waktu_selesai' => '16:00',
                'tempat' => 'Ruang Rapat 3',
                'status' => 'Dijadwalkan',
            ],
            // Rapat Evaluasi - Laporan Semester
            [
                'agenda_rapat' => 'Pembahasan Laporan Semester Ganjil',
                'jenis_rapat' => 'Evaluasi',
                'pimpinan' => $guruSiti?->nama ?? 'Siti Nurhaliza',
                'pimpinan_id' => $guruSiti?->id,
                'sekretaris' => $guruRizky?->nama ?? 'Rizky Ramadhan',
                'sekretaris_id' => $guruRizky?->id,
                'peserta_rapat' => json_encode($allGuruIds),
                'tanggal' => $today->copy()->addDays(20)->format('Y-m-d'),
                'waktu_mulai' => '08:00',
                'waktu_selesai' => '12:00',
                'tempat' => 'Aula Madrasah',
                'status' => 'Dijadwalkan',
            ],
            // Rapat Rutin - Rapat Wali Kelas
            [
                'agenda_rapat' => 'Rapat Wali Kelas',
                'jenis_rapat' => 'Rutin',
                'pimpinan' => $guruAhmad?->nama ?? 'Ahmad Fauzi',
                'pimpinan_id' => $guruAhmad?->id,
                'sekretaris' => $guruNur?->nama ?? 'Nur Aini',
                'sekretaris_id' => $guruNur?->id,
                'peserta_rapat' => json_encode(array_slice($allGuruIds, 0, 9)),
                'tanggal' => $today->copy()->addDays(7)->format('Y-m-d'),
                'waktu_mulai' => '10:00',
                'waktu_selesai' => '12:00',
                'tempat' => 'Ruang Rapat Utama',
                'status' => 'Dijadwalkan',
            ],
            // Rapat Darurat - Penanganan Masalah Kedisiplinan
            [
                'agenda_rapat' => 'Penanganan Kasus Kedisiplinan Santri',
                'jenis_rapat' => 'Darurat',
                'pimpinan' => $guruBudi?->nama ?? 'Budi Santoso',
                'pimpinan_id' => $guruBudi?->id,
                'sekretaris' => $guruSiti?->nama ?? 'Siti Nurhaliza',
                'sekretaris_id' => $guruSiti?->id,
                'peserta_rapat' => json_encode(array_slice($allGuruIds, 0, 5)),
                'tanggal' => $today->copy()->addDays(2)->format('Y-m-d'),
                'waktu_mulai' => '15:00',
                'waktu_selesai' => '17:00',
                'tempat' => 'Ruang Kepala Madrasah',
                'status' => 'Dijadwalkan',
            ],
            // Rapat Koordinasi - Persiapan Haflah
            [
                'agenda_rapat' => 'Persiapan Haflah Akhirussanah',
                'jenis_rapat' => 'Koordinasi',
                'pimpinan' => $guruNur?->nama ?? 'Nur Aini',
                'pimpinan_id' => $guruNur?->id,
                'sekretaris' => $guruDewi?->nama ?? 'Dewi Lestari',
                'sekretaris_id' => $guruDewi?->id,
                'peserta_rapat' => json_encode($allGuruIds),
                'tanggal' => $today->copy()->addMonths(4)->format('Y-m-d'),
                'waktu_mulai' => '09:00',
                'waktu_selesai' => '12:00',
                'tempat' => 'Aula Madrasah',
                'status' => 'Dijadwalkan',
            ],
        ];

        foreach ($data as $item) {
            DB::table('rapat')->insert(array_merge($item, [
                'created_at' => now(),
                'updated_at' => now(),
            ]));
        }

        $this->command->info('RapatSeeder: ' . count($data) . ' rapat created.');
    }
}
