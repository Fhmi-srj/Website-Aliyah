<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class KegiatanSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Get PJ guru IDs
        $guruAhmad = DB::table('guru')->where('nama', 'like', 'Ahmad Fauzi%')->first();
        $guruSiti = DB::table('guru')->where('nama', 'like', 'Siti Nurhaliza%')->first();
        $guruBudi = DB::table('guru')->where('nama', 'like', 'Budi Santoso%')->first();
        $guruDewi = DB::table('guru')->where('nama', 'like', 'Dewi Lestari%')->first();
        $guruRizky = DB::table('guru')->where('nama', 'like', 'Rizky Ramadhan%')->first();
        $guruNur = DB::table('guru')->where('nama', 'like', 'Nur Aini%')->first();

        // Get kelas IDs
        $kelasIds = DB::table('kelas')->where('status', 'Aktif')->pluck('id')->toArray();

        $data = [
            [
                'nama_kegiatan' => 'Upacara Bendera',
                'jenis_kegiatan' => 'Rutin',
                'waktu_mulai' => now()->next('Monday')->addHours(7),
                'waktu_berakhir' => now()->next('Monday')->addHours(8),
                'tempat' => 'Lapangan Utama',
                'penanggung_jawab_id' => $guruAhmad?->id,
                'penanggung_jawab' => $guruAhmad?->nama ?? '-',
                'guru_pendamping' => json_encode(array_filter([$guruBudi?->id, $guruSiti?->id, $guruDewi?->id])),
                'peserta' => 'Semua Siswa',
                'kelas_peserta' => json_encode($kelasIds),
                'deskripsi' => 'Upacara bendera rutin setiap hari Senin',
                'status' => 'Aktif',
            ],
            [
                'nama_kegiatan' => 'Kajian Jumat',
                'jenis_kegiatan' => 'Rutin',
                'waktu_mulai' => now()->next('Friday')->addHours(7),
                'waktu_berakhir' => now()->next('Friday')->addHours(8),
                'tempat' => 'Aula Madrasah',
                'penanggung_jawab_id' => $guruNur?->id,
                'penanggung_jawab' => $guruNur?->nama ?? '-',
                'guru_pendamping' => json_encode(array_filter([$guruRizky?->id])),
                'peserta' => 'Semua Siswa',
                'kelas_peserta' => json_encode($kelasIds),
                'deskripsi' => 'Kajian keagamaan rutin setiap Jumat pagi',
                'status' => 'Aktif',
            ],
            [
                'nama_kegiatan' => 'Class Meeting',
                'jenis_kegiatan' => 'Tahunan',
                'waktu_mulai' => now()->addMonths(5)->setHour(8),
                'waktu_berakhir' => now()->addMonths(5)->addDays(3)->setHour(15),
                'tempat' => 'Seluruh Area Sekolah',
                'penanggung_jawab_id' => $guruBudi?->id,
                'penanggung_jawab' => $guruBudi?->nama ?? '-',
                'guru_pendamping' => json_encode(array_filter([$guruAhmad?->id, $guruSiti?->id, $guruDewi?->id, $guruRizky?->id])),
                'peserta' => 'Semua Siswa',
                'kelas_peserta' => json_encode($kelasIds),
                'deskripsi' => 'Kegiatan class meeting akhir semester',
                'status' => 'Aktif',
            ],
            [
                'nama_kegiatan' => 'Wisuda dan Perpisahan Kelas XII',
                'jenis_kegiatan' => 'Tahunan',
                'waktu_mulai' => now()->addMonths(6)->setHour(8),
                'waktu_berakhir' => now()->addMonths(6)->setHour(12),
                'tempat' => 'Aula Madrasah',
                'penanggung_jawab_id' => $guruAhmad?->id,
                'penanggung_jawab' => $guruAhmad?->nama ?? '-',
                'guru_pendamping' => json_encode(array_filter([$guruBudi?->id, $guruSiti?->id])),
                'peserta' => 'Kelas XII',
                'kelas_peserta' => json_encode(DB::table('kelas')->where('tingkat', 'XII')->pluck('id')->toArray()),
                'deskripsi' => 'Acara wisuda dan perpisahan siswa kelas XII',
                'status' => 'Aktif',
            ],
            [
                'nama_kegiatan' => 'Pelatihan Olimpiade Sains',
                'jenis_kegiatan' => 'Insidental',
                'waktu_mulai' => now()->addWeeks(2)->setHour(13),
                'waktu_berakhir' => now()->addWeeks(2)->setHour(16),
                'tempat' => 'Lab IPA',
                'penanggung_jawab_id' => $guruDewi?->id,
                'penanggung_jawab' => $guruDewi?->nama ?? '-',
                'guru_pendamping' => json_encode(array_filter([$guruBudi?->id])),
                'peserta' => 'Siswa Pilihan',
                'kelas_peserta' => json_encode([]),
                'deskripsi' => 'Pelatihan persiapan olimpiade sains tingkat kabupaten',
                'status' => 'Aktif',
            ],
        ];

        foreach ($data as $item) {
            DB::table('kegiatan')->insert(array_merge($item, [
                'created_at' => now(),
                'updated_at' => now(),
            ]));
        }
    }
}
