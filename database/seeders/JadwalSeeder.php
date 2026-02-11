<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Jadwal;
use App\Models\Guru;
use App\Models\Mapel;
use App\Models\Kelas;
use App\Models\JamPelajaran;
use App\Models\TahunAjaran;

class JadwalSeeder extends Seeder
{
    public function run(): void
    {
        // Get the current tahun ajaran
        $tahunAjaran = TahunAjaran::getCurrent();
        $tahunAjaranId = $tahunAjaran ? $tahunAjaran->id : null;

        // Mapping helper functions
        $guruMap = Guru::pluck('id', 'nama')->toArray();
        $mapelMap = Mapel::pluck('id', 'nama_mapel')->toArray();
        $kelasMap = Kelas::pluck('id', 'nama_kelas')->toArray();
        $jamMap = JamPelajaran::pluck('id', 'jam_ke')->toArray();

        // Helper to find guru ID by partial name
        $findGuru = function ($name) use ($guruMap) {
            foreach ($guruMap as $fullName => $id) {
                if (stripos($fullName, $name) !== false || stripos($name, explode(' ', $fullName)[0]) !== false) {
                    return $id;
                }
            }
            return null;
        };

        // Helper to find mapel ID by partial name
        $findMapel = function ($name) use ($mapelMap) {
            foreach ($mapelMap as $fullName => $id) {
                if (stripos($fullName, $name) !== false || stripos($name, $fullName) !== false) {
                    return $id;
                }
            }
            return null;
        };

        // Data jadwal dari gambar (hari, jam_mulai, jam_sampai, mapel, guru, kelas)
        $jadwalData = [
            // Sabtu
            ['Sabtu', '1', '2', 'Qurdis', 'Ismail Saleh', 'X'],
            ['Sabtu', '3', '4', 'B. Arab', 'Dewi Rokh', 'X'],
            ['Sabtu', '5', '6', 'Matematika', 'M. Arief', 'X'],
            ['Sabtu', '7', '8', 'SKI', 'M. Zaenal', 'X'],
            ['Sabtu', '1', '2', 'B. Arab Pem', 'Muhammad', 'XI'],
            ['Sabtu', '3', '4', 'PKN', 'Ismail Saleh', 'XI'],
            ['Sabtu', '5', '6', 'Akidah Akhlak', 'Maafi', 'XI'],
            ['Sabtu', '7', '8', 'Bimbingan', 'Didi Madh', 'XI'],
            ['Sabtu', '1', '2', 'Muhadasah', 'Dewi Rokh', 'XII'],
            ['Sabtu', '3', '4', 'Akidah Akhlak', 'Maafi', 'XII'],
            ['Sabtu', '5', '6', 'SKI', 'M. Zaenal', 'XII'],
            ['Sabtu', '7', '8', 'Matematika', 'M. Arief', 'XII'],
            // Minggu
            ['Minggu', '1', '2', 'B. Indonesia', 'Agus Amin', 'X'],
            ['Minggu', '3', '4', 'Akidah Akhlak', 'Maafi', 'X'],
            ['Minggu', '5', '6', 'Bimbingan', 'Didi Madh', 'X'],
            ['Minggu', '7', '8', 'Tahfidz', 'Muhammad', 'X'],
            ['Minggu', '1', '3', 'Olahraga', 'Muhammad', 'XI'],
            ['Minggu', '4', '5', 'Qurdis', 'Ismail Saleh', 'XI'],
            ['Minggu', '6', '8', 'B. Indonesia', 'Agus Amin', 'XI'],
            ['Minggu', '1', '2', 'PKN', 'Ismail Saleh', 'XII'],
            ['Minggu', '3', '5', 'B. Indonesia', 'Agus Amin', 'XII'],
            ['Minggu', '7', '8', 'Aswaja', 'Rino Mukti', 'XII'],
            // Senin
            ['Senin', '1', '1', 'Upacara', 'Semua Guru', 'X'],
            ['Senin', '2', '3', 'B. Arab Pem', 'Didi Madh', 'X'],
            ['Senin', '4', '5', 'Fikih', 'Muhammad', 'X'],
            ['Senin', '6', '7', 'B. Inggris', 'Syahrul Ad', 'X'],
            ['Senin', '1', '1', 'Upacara', 'Semua Guru', 'XI'],
            ['Senin', '2', '4', 'IT Komputer', 'M. Ihdisyir', 'XI'],
            ['Senin', '5', '6', 'Tahfidz', 'M. Muam', 'XI'],
            ['Senin', '7', '8', 'Tajwid', 'Muhammad', 'XI'],
            ['Senin', '1', '1', 'Upacara', 'Semua Guru', 'XII'],
            ['Senin', '2', '3', 'Fikih', 'Muhammad', 'XII'],
            ['Senin', '4', '5', 'Conversation', 'Syahrul Ad', 'XII'],
            ['Senin', '6', '8', 'IT Komputer', 'M. Ihdisyir', 'XII'],
            // Selasa
            ['Selasa', '1', '3', 'Olahraga', 'Muhammad', 'X'],
            ['Selasa', '4', '6', 'IT Komputer', 'M. Ihdisyir', 'X'],
            ['Selasa', '7', '8', 'Conversation', 'Syahrul Ad', 'X'],
            ['Selasa', '1', '2', 'Aswaja', 'Rino Mukti', 'XI'],
            ['Selasa', '3', '4', 'Matematika', 'M. Arief', 'XI'],
            ['Selasa', '5', '6', 'B. Inggris', 'Syahrul Ad', 'XI'],
            ['Selasa', '7', '8', 'Tahfidz', 'M. Muam', 'XI'],
            ['Selasa', '1', '2', 'Tajwid', 'Muhammad', 'XII'],
            ['Selasa', '3', '4', 'B. Arab Pem', 'Muhammad', 'XII'],
            ['Selasa', '5', '6', 'Tahfidz', 'M. Muam', 'XII'],
            ['Selasa', '7', '8', 'Matematika', 'M. Arief', 'XII'],
            // Rabu
            ['Rabu', '1', '2', 'PKN', 'Ismail Saleh', 'X'],
            ['Rabu', '3', '4', 'Muhadasah', 'Dewi Rokh', 'X'],
            ['Rabu', '5', '6', 'Tahfidz', 'Muhammad', 'X'],
            ['Rabu', '7', '8', 'Matematika', 'M. Arief', 'X'],
            ['Rabu', '1', '2', 'Fikih', 'Muhammad', 'XI'],
            ['Rabu', '3', '4', 'Matematika', 'M. Arief', 'XI'],
            ['Rabu', '5', '6', 'B. Arab', 'Dewi Rokh', 'XI'],
            ['Rabu', '7', '8', 'SKI', 'M. Zaenal', 'XI'],
            ['Rabu', '1', '3', 'Olahraga', 'Muhammad', 'XII'],
            ['Rabu', '5', '6', 'Qurdis', 'Ismail Saleh', 'XII'],
            ['Rabu', '7', '8', 'Tahfidz', 'M. Muam', 'XII'],
            // Kamis
            ['Kamis', '1', '3', 'Kamis Sehat', 'Semua Guru', 'X'],
            ['Kamis', '3', '4', 'Tajwid', 'Muhammad', 'X'],
            ['Kamis', '5', '6', 'Aswaja', 'Rino Mukti', 'X'],
            ['Kamis', '7', '8', 'Tahfidz', 'M. Muam', 'X'],
            ['Kamis', '1', '2', 'Kamis Sehat', 'Semua Guru', 'XI'],
            ['Kamis', '3', '4', 'Conversation', 'Syahrul Ad', 'XI'],
            ['Kamis', '5', '6', 'Muhadasah', 'Dewi Rokh', 'XI'],
            ['Kamis', '7', '8', 'Tahfidz', 'M. Muam', 'XI'],
            ['Kamis', '1', '2', 'Kamis Sehat', 'Semua Guru', 'XII'],
            ['Kamis', '3', '4', 'B. Arab', 'Dewi Rokh', 'XII'],
            ['Kamis', '5', '6', 'B. Inggris', 'Syahrul Ad', 'XII'],
            ['Kamis', '7', '8', 'Tahfidz', 'M. Muam', 'XII'],
        ];

        // Clear existing jadwal first (disable foreign key checks)
        \DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        Jadwal::truncate();
        \DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        foreach ($jadwalData as $data) {
            [$hari, $jamMulai, $jamSampai, $mapel, $guru, $kelas] = $data;

            // Find IDs
            $guruId = $findGuru($guru);
            $mapelId = $findMapel($mapel);
            $kelasId = $kelasMap[$kelas] ?? null;
            $jamPelajaranId = $jamMap[$jamMulai] ?? null;
            $jamPelajaranSampaiId = ($jamMulai != $jamSampai) ? ($jamMap[$jamSampai] ?? null) : null;

            if ($guruId && $mapelId && $kelasId) {
                Jadwal::create([
                    'hari' => $hari,
                    'jam_ke' => $jamMulai,
                    'jam_pelajaran_id' => $jamPelajaranId,
                    'jam_pelajaran_sampai_id' => $jamPelajaranSampaiId,
                    'guru_id' => $guruId,
                    'mapel_id' => $mapelId,
                    'kelas_id' => $kelasId,
                    'tahun_ajaran_id' => $tahunAjaranId,
                    'status' => 'Aktif',
                ]);
            } else {
                echo "Skipped: $hari - $mapel - $guru - $kelas (Guru: $guruId, Mapel: $mapelId, Kelas: $kelasId)\n";
            }
        }

        echo "Total jadwal inserted: " . Jadwal::count() . "\n";
    }
}
