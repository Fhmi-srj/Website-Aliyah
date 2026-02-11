<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Carbon\Carbon;

class KegiatanSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Disable foreign key checks and clear existing data
        Schema::disableForeignKeyConstraints();
        DB::table('absensi_kegiatan')->truncate();
        DB::table('kegiatan')->truncate();
        Schema::enableForeignKeyConstraints();

        // Get guru IDs for PJ and pendamping
        $guruList = DB::table('guru')->where('status', 'Aktif')->get();

        if ($guruList->isEmpty()) {
            $this->command->warn('No active teachers found. Please run GuruSeeder first.');
            return;
        }

        // Get kelas IDs
        $kelasIds = DB::table('kelas')->where('status', 'Aktif')->pluck('id')->toArray();
        $kelasXII = DB::table('kelas')->where('tingkat', 'XII')->pluck('id')->toArray();
        $kelasX = DB::table('kelas')->where('tingkat', 'X')->pluck('id')->toArray();

        // Get specific guru (or use first available)
        $getGuruByName = function ($name) use ($guruList) {
            return $guruList->first(fn($g) => str_contains(strtolower($g->nama), strtolower($name)));
        };

        $guruAhmad = $getGuruByName('Ahmad') ?? $guruList[0] ?? null;
        $guruSiti = $getGuruByName('Siti') ?? $guruList[1] ?? null;
        $guruBudi = $getGuruByName('Budi') ?? $guruList[2] ?? null;
        $guruDewi = $getGuruByName('Dewi') ?? $guruList[3] ?? null;
        $guruRizky = $getGuruByName('Rizky') ?? $guruList[4] ?? null;
        $guruNur = $getGuruByName('Nur') ?? $guruList[5] ?? null;

        // Base date for kegiatan (today)
        $today = Carbon::now();
        $nextMonday = $today->copy()->next(Carbon::MONDAY);
        $nextFriday = $today->copy()->next(Carbon::FRIDAY);

        $data = [
            // Kegiatan Rutin - Upacara (setiap Senin)
            [
                'nama_kegiatan' => 'Upacara Bendera',
                'jenis_kegiatan' => 'Rutin',
                'waktu_mulai' => $nextMonday->copy()->setTime(7, 0),
                'waktu_berakhir' => $nextMonday->copy()->setTime(8, 0),
                'tempat' => 'Lapangan Utama',
                'penanggung_jawab_id' => $guruAhmad?->id,
                'penanggung_jawab' => $guruAhmad?->nama ?? 'Ahmad Fauzi',
                'guru_pendamping' => json_encode(array_filter([$guruBudi?->id, $guruSiti?->id, $guruDewi?->id])),
                'peserta' => 'Semua Siswa',
                'kelas_peserta' => json_encode($kelasIds),
                'deskripsi' => 'Upacara bendera rutin setiap hari Senin pagi untuk menumbuhkan semangat nasionalisme dan kedisiplinan santri.',
                'status' => 'Aktif',
            ],
            // Kegiatan Rutin - Kajian Jumat
            [
                'nama_kegiatan' => 'Kajian Jumat Pagi',
                'jenis_kegiatan' => 'Rutin',
                'waktu_mulai' => $nextFriday->copy()->setTime(7, 0),
                'waktu_berakhir' => $nextFriday->copy()->setTime(8, 30),
                'tempat' => 'Aula Madrasah',
                'penanggung_jawab_id' => $guruNur?->id,
                'penanggung_jawab' => $guruNur?->nama ?? 'Nur Aini',
                'guru_pendamping' => json_encode(array_filter([$guruRizky?->id, $guruAhmad?->id])),
                'peserta' => 'Semua Siswa',
                'kelas_peserta' => json_encode($kelasIds),
                'deskripsi' => 'Kajian keagamaan rutin setiap Jumat pagi membahas kitab dan hadits pilihan untuk meningkatkan pengetahuan agama santri.',
                'status' => 'Aktif',
            ],
            // Kegiatan Tahunan - Haflah Akhirussanah
            [
                'nama_kegiatan' => 'Haflah Akhirussanah',
                'jenis_kegiatan' => 'Tahunan',
                'waktu_mulai' => $today->copy()->addMonths(5)->setTime(8, 0),
                'waktu_berakhir' => $today->copy()->addMonths(5)->setTime(15, 0),
                'tempat' => 'Aula Madrasah',
                'penanggung_jawab_id' => $guruAhmad?->id,
                'penanggung_jawab' => $guruAhmad?->nama ?? 'Ahmad Fauzi',
                'guru_pendamping' => json_encode(array_filter([$guruBudi?->id, $guruSiti?->id, $guruDewi?->id, $guruNur?->id])),
                'peserta' => 'Kelas XII',
                'kelas_peserta' => json_encode($kelasXII),
                'deskripsi' => 'Acara wisuda dan perpisahan santri kelas XII dengan penampilan seni dan pemberian penghargaan.',
                'status' => 'Aktif',
            ],
            // Kegiatan Tahunan - Penerimaan Santri Baru
            [
                'nama_kegiatan' => 'PPDB Tahun Ajaran 2025/2026',
                'jenis_kegiatan' => 'Tahunan',
                'waktu_mulai' => $today->copy()->addMonths(6)->setTime(8, 0),
                'waktu_berakhir' => $today->copy()->addMonths(6)->addDays(14)->setTime(15, 0),
                'tempat' => 'Gedung Pusat Pendaftaran',
                'penanggung_jawab_id' => $guruSiti?->id,
                'penanggung_jawab' => $guruSiti?->nama ?? 'Siti Nurhaliza',
                'guru_pendamping' => json_encode(array_filter([$guruBudi?->id, $guruRizky?->id])),
                'peserta' => 'Calon Santri Baru',
                'kelas_peserta' => json_encode([]),
                'deskripsi' => 'Penerimaan Peserta Didik Baru (PPDB) untuk tahun ajaran 2025/2026.',
                'status' => 'Aktif',
            ],
            // Kegiatan Insidental - Lomba Tahfidz
            [
                'nama_kegiatan' => 'Lomba Tahfidz Antar Kelas',
                'jenis_kegiatan' => 'Insidental',
                'waktu_mulai' => $today->copy()->addWeeks(2)->setTime(8, 0),
                'waktu_berakhir' => $today->copy()->addWeeks(2)->setTime(15, 0),
                'tempat' => 'Aula Madrasah',
                'penanggung_jawab_id' => $guruDewi?->id,
                'penanggung_jawab' => $guruDewi?->nama ?? 'Dewi Lestari',
                'guru_pendamping' => json_encode(array_filter([$guruNur?->id, $guruAhmad?->id])),
                'peserta' => 'Semua Siswa',
                'kelas_peserta' => json_encode($kelasIds),
                'deskripsi' => 'Lomba hafalan Al-Quran antar kelas untuk memotivasi santri dalam menghafal Al-Quran.',
                'status' => 'Aktif',
            ],
            // Kegiatan Insidental - Pelatihan Kader Dakwah
            [
                'nama_kegiatan' => 'Pelatihan Kader Dakwah',
                'jenis_kegiatan' => 'Insidental',
                'waktu_mulai' => $today->copy()->addWeeks(3)->setTime(9, 0),
                'waktu_berakhir' => $today->copy()->addWeeks(3)->setTime(16, 0),
                'tempat' => 'Ruang Multimedia',
                'penanggung_jawab_id' => $guruRizky?->id,
                'penanggung_jawab' => $guruRizky?->nama ?? 'Rizky Ramadhan',
                'guru_pendamping' => json_encode(array_filter([$guruNur?->id])),
                'peserta' => 'Siswa Pilihan',
                'kelas_peserta' => json_encode([]),
                'deskripsi' => 'Pelatihan intensif untuk kader dakwah muda dari santri terpilih.',
                'status' => 'Aktif',
            ],
            // Kegiatan Rutin - Muhadharah (Latihan Pidato)
            [
                'nama_kegiatan' => 'Muhadharah',
                'jenis_kegiatan' => 'Rutin',
                'waktu_mulai' => $today->copy()->next(Carbon::THURSDAY)->setTime(19, 30),
                'waktu_berakhir' => $today->copy()->next(Carbon::THURSDAY)->setTime(21, 0),
                'tempat' => 'Aula Madrasah',
                'penanggung_jawab_id' => $guruBudi?->id,
                'penanggung_jawab' => $guruBudi?->nama ?? 'Budi Santoso',
                'guru_pendamping' => json_encode(array_filter([$guruSiti?->id, $guruDewi?->id])),
                'peserta' => 'Semua Siswa',
                'kelas_peserta' => json_encode($kelasIds),
                'deskripsi' => 'Latihan pidato rutin dalam tiga bahasa (Arab, Inggris, Indonesia) untuk meningkatkan kemampuan public speaking santri.',
                'status' => 'Aktif',
            ],
            // Kegiatan Tahunan - MOPDB
            [
                'nama_kegiatan' => 'Masa Orientasi Peserta Didik Baru',
                'jenis_kegiatan' => 'Tahunan',
                'waktu_mulai' => $today->copy()->addMonths(7)->setTime(7, 0),
                'waktu_berakhir' => $today->copy()->addMonths(7)->addDays(5)->setTime(15, 0),
                'tempat' => 'Seluruh Area Madrasah',
                'penanggung_jawab_id' => $guruBudi?->id,
                'penanggung_jawab' => $guruBudi?->nama ?? 'Budi Santoso',
                'guru_pendamping' => json_encode(array_filter([$guruAhmad?->id, $guruSiti?->id, $guruDewi?->id, $guruRizky?->id, $guruNur?->id])),
                'peserta' => 'Kelas X',
                'kelas_peserta' => json_encode($kelasX),
                'deskripsi' => 'Masa Orientasi Peserta Didik Baru untuk mengenalkan lingkungan madrasah dan pondok pesantren.',
                'status' => 'Aktif',
            ],
        ];

        // Get active tahun ajaran
        $activeTahunAjaran = DB::table('tahun_ajaran')
            ->where('nama', '2025/2026')
            ->first();

        $tahunAjaranId = $activeTahunAjaran?->id;

        foreach ($data as $item) {
            DB::table('kegiatan')->insert(array_merge($item, [
                'status_kbm' => 'Aktif',
                'tahun_ajaran_id' => $tahunAjaranId,
                'created_at' => now(),
                'updated_at' => now(),
            ]));
        }

        $this->command->info('KegiatanSeeder: ' . count($data) . ' kegiatan created.');
    }
}
