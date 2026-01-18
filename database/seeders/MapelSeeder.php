<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class MapelSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * Mata Pelajaran untuk Madrasah Aliyah dengan fokus Kitab dan Tahfidz
     */
    public function run(): void
    {
        $data = [
            // Mata Pelajaran Keagamaan (Fokus Utama)
            ['nama_mapel' => 'Al-Quran Hadits', 'inisial' => 'QH', 'kode_mapel' => 'AGM-01', 'kkm' => 75, 'status' => 'Aktif'],
            ['nama_mapel' => 'Tahfidz Al-Quran', 'inisial' => 'TQ', 'kode_mapel' => 'AGM-02', 'kkm' => 75, 'status' => 'Aktif'],
            ['nama_mapel' => 'Aqidah Akhlak', 'inisial' => 'AA', 'kode_mapel' => 'AGM-03', 'kkm' => 75, 'status' => 'Aktif'],
            ['nama_mapel' => 'Fiqih', 'inisial' => 'FQH', 'kode_mapel' => 'AGM-04', 'kkm' => 75, 'status' => 'Aktif'],
            ['nama_mapel' => 'Sejarah Kebudayaan Islam', 'inisial' => 'SKI', 'kode_mapel' => 'AGM-05', 'kkm' => 75, 'status' => 'Aktif'],

            // Kitab Kuning
            ['nama_mapel' => 'Nahwu Shorof', 'inisial' => 'NS', 'kode_mapel' => 'KTB-01', 'kkm' => 70, 'status' => 'Aktif'],
            ['nama_mapel' => 'Kitab Tafsir', 'inisial' => 'TFS', 'kode_mapel' => 'KTB-02', 'kkm' => 70, 'status' => 'Aktif'],
            ['nama_mapel' => 'Kitab Hadits', 'inisial' => 'HDS', 'kode_mapel' => 'KTB-03', 'kkm' => 70, 'status' => 'Aktif'],
            ['nama_mapel' => 'Kitab Fiqih', 'inisial' => 'KFQ', 'kode_mapel' => 'KTB-04', 'kkm' => 70, 'status' => 'Aktif'],
            ['nama_mapel' => 'Kitab Tasawuf', 'inisial' => 'TSW', 'kode_mapel' => 'KTB-05', 'kkm' => 70, 'status' => 'Aktif'],

            // Bahasa
            ['nama_mapel' => 'Bahasa Arab', 'inisial' => 'BARB', 'kode_mapel' => 'BHS-01', 'kkm' => 70, 'status' => 'Aktif'],
            ['nama_mapel' => 'Bahasa Indonesia', 'inisial' => 'BIND', 'kode_mapel' => 'BHS-02', 'kkm' => 70, 'status' => 'Aktif'],
            ['nama_mapel' => 'Bahasa Inggris', 'inisial' => 'BING', 'kode_mapel' => 'BHS-03', 'kkm' => 70, 'status' => 'Aktif'],

            // Mata Pelajaran Umum
            ['nama_mapel' => 'Matematika', 'inisial' => 'MTK', 'kode_mapel' => 'UMM-01', 'kkm' => 70, 'status' => 'Aktif'],
            ['nama_mapel' => 'IPA', 'inisial' => 'IPA', 'kode_mapel' => 'UMM-02', 'kkm' => 70, 'status' => 'Aktif'],
            ['nama_mapel' => 'IPS', 'inisial' => 'IPS', 'kode_mapel' => 'UMM-03', 'kkm' => 70, 'status' => 'Aktif'],
            ['nama_mapel' => 'PKn', 'inisial' => 'PKN', 'kode_mapel' => 'UMM-04', 'kkm' => 70, 'status' => 'Aktif'],

            // Keterampilan
            ['nama_mapel' => 'Seni Baca Al-Quran', 'inisial' => 'SBQ', 'kode_mapel' => 'KTR-01', 'kkm' => 70, 'status' => 'Aktif'],
            ['nama_mapel' => 'Khot/Kaligrafi', 'inisial' => 'KHT', 'kode_mapel' => 'KTR-02', 'kkm' => 70, 'status' => 'Aktif'],
            ['nama_mapel' => 'Penjas', 'inisial' => 'PJS', 'kode_mapel' => 'KTR-03', 'kkm' => 70, 'status' => 'Aktif'],
        ];

        foreach ($data as $item) {
            DB::table('mapel')->insert(array_merge($item, [
                'created_at' => now(),
                'updated_at' => now(),
            ]));
        }
    }
}
