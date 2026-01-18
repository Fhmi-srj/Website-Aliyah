<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class JadwalSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * Jadwal Lengkap untuk Madrasah Aliyah dengan fokus Kitab dan Tahfidz
     * Format: 1 entry per kombinasi guru+mapel+kelas+hari dengan jam_ke = jumlah JP
     */
    public function run(): void
    {
        // Get All Guru IDs
        $guru = [
            'tahfidz1' => DB::table('guru')->where('nama', 'like', '%Hafidz Rahman%')->first(),
            'tahfidz2' => DB::table('guru')->where('nama', 'like', '%Siti Aisyah%')->first(),
            'tahfidz3' => DB::table('guru')->where('nama', 'like', '%Yusuf Mansur%')->first(),
            'kitab1' => DB::table('guru')->where('nama', 'like', '%Umar Said%')->first(),
            'kitab2' => DB::table('guru')->where('nama', 'like', '%Ibrahim Nawawi%')->first(),
            'kitab3' => DB::table('guru')->where('nama', 'like', '%Salim Azhari%')->first(),
            'fiqih' => DB::table('guru')->where('nama', 'like', '%Zakaria Ahmad%')->first(),
            'akidah' => DB::table('guru')->where('nama', 'like', '%Fatimah Zahra%')->first(),
            'ski' => DB::table('guru')->where('nama', 'like', '%Hasan Basri%')->first(),
            'arab' => DB::table('guru')->where('nama', 'like', '%Faruq Abdullah%')->first(),
            'bind' => DB::table('guru')->where('nama', 'like', '%Sri Wahyuni%')->first(),
            'bing' => DB::table('guru')->where('nama', 'like', '%Linda Permata%')->first(),
            'mtk' => DB::table('guru')->where('nama', 'like', '%Agus Riyanto%')->first(),
            'ipa' => DB::table('guru')->where('nama', 'like', '%Dewi Sartika%')->first(),
            'ips' => DB::table('guru')->where('nama', 'like', '%Dedi Mulyadi%')->first(),
            'pkn' => DB::table('guru')->where('nama', 'like', '%Bambang Sutrisno%')->first(),
            'kaligrafi' => DB::table('guru')->where('nama', 'like', '%Ahmad Khatib%')->first(),
        ];

        // Get All Mapel IDs
        $mapel = [
            'quranhadits' => DB::table('mapel')->where('nama_mapel', 'Al-Quran Hadits')->first(),
            'tahfidz' => DB::table('mapel')->where('nama_mapel', 'Tahfidz Al-Quran')->first(),
            'aqidah' => DB::table('mapel')->where('nama_mapel', 'Aqidah Akhlak')->first(),
            'fiqih' => DB::table('mapel')->where('nama_mapel', 'Fiqih')->first(),
            'ski' => DB::table('mapel')->where('nama_mapel', 'Sejarah Kebudayaan Islam')->first(),
            'nahwu' => DB::table('mapel')->where('nama_mapel', 'Nahwu Shorof')->first(),
            'tafsir' => DB::table('mapel')->where('nama_mapel', 'Kitab Tafsir')->first(),
            'hadits' => DB::table('mapel')->where('nama_mapel', 'Kitab Hadits')->first(),
            'kfiqih' => DB::table('mapel')->where('nama_mapel', 'Kitab Fiqih')->first(),
            'tasawuf' => DB::table('mapel')->where('nama_mapel', 'Kitab Tasawuf')->first(),
            'arab' => DB::table('mapel')->where('nama_mapel', 'Bahasa Arab')->first(),
            'bind' => DB::table('mapel')->where('nama_mapel', 'Bahasa Indonesia')->first(),
            'bing' => DB::table('mapel')->where('nama_mapel', 'Bahasa Inggris')->first(),
            'mtk' => DB::table('mapel')->where('nama_mapel', 'Matematika')->first(),
            'ipa' => DB::table('mapel')->where('nama_mapel', 'IPA')->first(),
            'ips' => DB::table('mapel')->where('nama_mapel', 'IPS')->first(),
            'pkn' => DB::table('mapel')->where('nama_mapel', 'PKn')->first(),
            'sbq' => DB::table('mapel')->where('nama_mapel', 'Seni Baca Al-Quran')->first(),
            'kaligrafi' => DB::table('mapel')->where('nama_mapel', 'Khot/Kaligrafi')->first(),
        ];

        // Get Kelas IDs
        $kelas = [
            'X' => DB::table('kelas')->where('nama_kelas', 'X')->first(),
            'XI' => DB::table('kelas')->where('nama_kelas', 'XI')->first(),
            'XII' => DB::table('kelas')->where('nama_kelas', 'XII')->first(),
        ];

        // Helper function to calculate jam_selesai (1 JP = 90 menit)
        $calculateSelesai = function ($jamMulai, $jp) {
            $time = strtotime($jamMulai);
            $endTime = $time + ($jp * 90 * 60); // JP * 90 menit
            return date('H:i:s', $endTime);
        };

        $data = [];

        // Helper function to add schedule
        $addJadwal = function ($guruKey, $mapelKey, $kelasKey, $hari, $jamMulai, $jp) use (&$data, $guru, $mapel, $kelas, $calculateSelesai) {
            if (!isset($guru[$guruKey]) || !$guru[$guruKey])
                return;
            if (!isset($mapel[$mapelKey]) || !$mapel[$mapelKey])
                return;
            if (!isset($kelas[$kelasKey]) || !$kelas[$kelasKey])
                return;

            $data[] = [
                'jam_ke' => (string) $jp,
                'jam_mulai' => $jamMulai,
                'jam_selesai' => $calculateSelesai($jamMulai, $jp),
                'guru_id' => $guru[$guruKey]->id,
                'mapel_id' => $mapel[$mapelKey]->id,
                'kelas_id' => $kelas[$kelasKey]->id,
                'hari' => $hari,
                'status' => 'Aktif',
            ];
        };

        // =============================================
        // SENIN - Fokus Tahfidz & Kitab
        // =============================================
        // Tahfidz Pagi (2 JP)
        $addJadwal('tahfidz1', 'tahfidz', 'X', 'Senin', '07:00:00', 2);
        $addJadwal('tahfidz2', 'tahfidz', 'XI', 'Senin', '07:00:00', 2);
        $addJadwal('tahfidz3', 'tahfidz', 'XII', 'Senin', '07:00:00', 2);

        // Nahwu Shorof (2 JP)
        $addJadwal('kitab1', 'nahwu', 'X', 'Senin', '10:00:00', 2);
        $addJadwal('kitab1', 'nahwu', 'XI', 'Senin', '13:00:00', 2);

        // Bahasa Arab (2 JP)
        $addJadwal('arab', 'arab', 'XII', 'Senin', '10:00:00', 2);

        // Matematika (2 JP)
        $addJadwal('mtk', 'mtk', 'XI', 'Senin', '10:00:00', 2);
        $addJadwal('mtk', 'mtk', 'XII', 'Senin', '13:00:00', 2);

        // =============================================
        // SELASA - Kitab & Aqidah
        // =============================================
        // Tahfidz (2 JP)
        $addJadwal('tahfidz1', 'tahfidz', 'X', 'Selasa', '07:00:00', 2);
        $addJadwal('tahfidz2', 'tahfidz', 'XI', 'Selasa', '07:00:00', 2);
        $addJadwal('tahfidz3', 'tahfidz', 'XII', 'Selasa', '07:00:00', 2);

        // Kitab Tafsir (2 JP)
        $addJadwal('kitab2', 'tafsir', 'X', 'Selasa', '10:00:00', 2);
        $addJadwal('kitab2', 'tafsir', 'XI', 'Selasa', '13:00:00', 2);

        // Aqidah Akhlak (2 JP)
        $addJadwal('akidah', 'aqidah', 'X', 'Selasa', '13:00:00', 2);
        $addJadwal('akidah', 'aqidah', 'XI', 'Selasa', '10:00:00', 2);
        $addJadwal('akidah', 'aqidah', 'XII', 'Selasa', '10:00:00', 2);

        // Fiqih (2 JP)
        $addJadwal('fiqih', 'fiqih', 'XII', 'Selasa', '13:00:00', 2);

        // =============================================
        // RABU - Mapel Umum + Bahasa
        // =============================================
        // Al-Quran Hadits (2 JP)
        $addJadwal('tahfidz1', 'quranhadits', 'X', 'Rabu', '07:00:00', 2);
        $addJadwal('tahfidz2', 'quranhadits', 'XI', 'Rabu', '07:00:00', 2);
        $addJadwal('tahfidz3', 'quranhadits', 'XII', 'Rabu', '07:00:00', 2);

        // Matematika (2 JP)
        $addJadwal('mtk', 'mtk', 'X', 'Rabu', '10:00:00', 2);
        $addJadwal('mtk', 'mtk', 'XI', 'Rabu', '13:00:00', 2);

        // Bahasa Indonesia (2 JP)
        $addJadwal('bind', 'bind', 'X', 'Rabu', '13:00:00', 2);
        $addJadwal('bind', 'bind', 'XI', 'Rabu', '10:00:00', 2);
        $addJadwal('bind', 'bind', 'XII', 'Rabu', '13:00:00', 2);

        // IPA (2 JP)
        $addJadwal('ipa', 'ipa', 'XII', 'Rabu', '10:00:00', 2);

        // =============================================
        // KAMIS - SKI, Hadits, Tasawuf
        // =============================================
        // Tahfidz (2 JP)
        $addJadwal('tahfidz1', 'tahfidz', 'X', 'Kamis', '07:00:00', 2);
        $addJadwal('tahfidz2', 'tahfidz', 'XI', 'Kamis', '07:00:00', 2);
        $addJadwal('tahfidz3', 'tahfidz', 'XII', 'Kamis', '07:00:00', 2);

        // SKI (2 JP)
        $addJadwal('ski', 'ski', 'X', 'Kamis', '10:00:00', 2);
        $addJadwal('ski', 'ski', 'XI', 'Kamis', '13:00:00', 2);

        // Kitab Hadits (2 JP)
        $addJadwal('kitab2', 'hadits', 'X', 'Kamis', '13:00:00', 2);
        $addJadwal('kitab2', 'hadits', 'XI', 'Kamis', '10:00:00', 2);
        $addJadwal('kitab2', 'hadits', 'XII', 'Kamis', '13:00:00', 2);

        // Kitab Tasawuf (2 JP)
        $addJadwal('kitab3', 'tasawuf', 'XII', 'Kamis', '10:00:00', 2);

        // =============================================
        // JUMAT - Tahfidz & Seni (Lebih singkat)
        // =============================================
        // Tahfidz (2 JP)
        $addJadwal('tahfidz1', 'tahfidz', 'X', 'Jumat', '07:30:00', 2);
        $addJadwal('tahfidz2', 'tahfidz', 'XI', 'Jumat', '07:30:00', 2);
        $addJadwal('tahfidz3', 'tahfidz', 'XII', 'Jumat', '07:30:00', 2);

        // Seni Baca Al-Quran (1 JP)
        $addJadwal('tahfidz3', 'sbq', 'X', 'Jumat', '10:00:00', 1);

        // Kaligrafi (1 JP)
        $addJadwal('kaligrafi', 'kaligrafi', 'XI', 'Jumat', '10:00:00', 1);
        $addJadwal('kaligrafi', 'kaligrafi', 'XII', 'Jumat', '10:00:00', 1);

        // =============================================
        // SABTU - Bahasa & Mapel Umum
        // =============================================
        // Bahasa Arab (2 JP)
        $addJadwal('arab', 'arab', 'X', 'Sabtu', '07:00:00', 2);
        $addJadwal('arab', 'arab', 'XI', 'Sabtu', '10:00:00', 2);
        $addJadwal('arab', 'arab', 'XII', 'Sabtu', '13:00:00', 2);

        // Bahasa Inggris (2 JP)
        $addJadwal('bing', 'bing', 'X', 'Sabtu', '10:00:00', 2);
        $addJadwal('bing', 'bing', 'XI', 'Sabtu', '07:00:00', 2);
        $addJadwal('bing', 'bing', 'XII', 'Sabtu', '10:00:00', 2);

        // IPS (2 JP)
        $addJadwal('ips', 'ips', 'X', 'Sabtu', '13:00:00', 2);
        $addJadwal('ips', 'ips', 'XI', 'Sabtu', '13:00:00', 2);

        // PKn (2 JP)
        $addJadwal('pkn', 'pkn', 'X', 'Sabtu', '15:30:00', 2);
        $addJadwal('pkn', 'pkn', 'XI', 'Sabtu', '15:30:00', 2);
        $addJadwal('pkn', 'pkn', 'XII', 'Sabtu', '15:30:00', 2);

        // Fiqih (2 JP)
        $addJadwal('fiqih', 'fiqih', 'X', 'Sabtu', '10:00:00', 2);
        $addJadwal('fiqih', 'fiqih', 'XI', 'Sabtu', '13:00:00', 2);

        // Insert all data
        foreach ($data as $item) {
            DB::table('jadwal')->insert(array_merge($item, [
                'semester' => 'Ganjil',
                'tahun_ajaran' => '2025/2026',
                'created_at' => now(),
                'updated_at' => now(),
            ]));
        }
    }
}
