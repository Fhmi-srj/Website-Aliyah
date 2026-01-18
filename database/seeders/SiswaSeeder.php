<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class SiswaSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Get kelas IDs
        $kelas = DB::table('kelas')->pluck('id', 'nama_kelas')->toArray();

        // Nama-nama realistis Indonesia
        $namaLaki = [
            'Muhammad Rizky Pratama',
            'Ahmad Fadli Hidayat',
            'Dimas Setiawan',
            'Rafi Ardiansyah',
            'Fauzan Azhari',
            'Gilang Ramadhan',
            'Aldi Firmansyah',
            'Bagas Surya Putra',
            'Yoga Pratama',
            'Dani Kurniawan',
            'Fadhil Rahman',
            'Reza Mahendra',
            'Ilham Maulana',
            'Arif Budiman',
            'Rizal Pahlevi',
            'Hafiz Abdullah',
            'Naufal Zaki',
            'Iqbal Hakim',
            'Farhan Maulana',
            'Aditya Nugraha'
        ];

        $namaPerempuan = [
            'Aisyah Putri Rahayu',
            'Siti Fatimah',
            'Nur Azizah',
            'Dinda Permatasari',
            'Anisa Rahma',
            'Zahra Amelia',
            'Nabila Syahrani',
            'Salsa Aulia',
            'Keyla Azzahra',
            'Riska Amelia',
            'Nadia Safitri',
            'Intan Permata',
            'Dewi Kartika',
            'Melani Anggraini',
            'Putri Wulandari',
            'Alya Khairunnisa',
            'Syifa Nadhifa',
            'Aurel Hermansyah',
            'Tiara Andini',
            'Salsabila Adriani'
        ];

        $kotaLahir = [
            'Jakarta',
            'Bandung',
            'Surabaya',
            'Yogyakarta',
            'Semarang',
            'Malang',
            'Bogor',
            'Bekasi',
            'Tangerang',
            'Depok',
            'Cirebon',
            'Tasikmalaya'
        ];

        $asalSekolah = [
            'MTs Negeri 1',
            'MTs Negeri 2',
            'MTs Swasta Al-Hikmah',
            'MTs Swasta Darul Ulum',
            'SMP Negeri 1',
            'SMP Negeri 2',
            'SMP Negeri 3',
            'SMP Swasta Bina Bangsa',
            'MTs Al-Muawanah',
            'MTs Mathlaul Anwar',
            'SMP Islam Terpadu',
            'MTs Plus Darul Huda'
        ];

        $alamat = [
            'Jl. Raya Utama No.',
            'Jl. Merdeka No.',
            'Jl. Ahmad Yani No.',
            'Jl. Sudirman No.',
            'Jl. Diponegoro No.',
            'Jl. Gatot Subroto No.',
            'Jl. Pahlawan No.',
            'Jl. Veteran No.',
            'Kp. Sukamaju RT 01/02',
            'Kp. Ciherang RT 03/04',
            'Kp. Cibiru RT 02/05',
            'Kp. Margaluyu RT 04/03'
        ];

        $data = [];
        $nis = 10001;
        $indexLaki = 0;
        $indexPerempuan = 0;

        // Distribusi siswa per kelas - 12 siswa per kelas
        $kelasDistribusi = [
            'X' => ['count' => 12, 'tahun_lahir' => [2009, 2010]],
            'XI' => ['count' => 12, 'tahun_lahir' => [2008, 2009]],
            'XII' => ['count' => 12, 'tahun_lahir' => [2007, 2008]],
        ];

        foreach ($kelasDistribusi as $namaKelas => $config) {
            if (!isset($kelas[$namaKelas]))
                continue;

            for ($i = 0; $i < $config['count']; $i++) {
                // Alternating gender
                $isLaki = ($i % 2 === 0);

                if ($isLaki && $indexLaki < count($namaLaki)) {
                    $nama = $namaLaki[$indexLaki];
                    $jk = 'L';
                    $indexLaki++;
                } elseif (!$isLaki && $indexPerempuan < count($namaPerempuan)) {
                    $nama = $namaPerempuan[$indexPerempuan];
                    $jk = 'P';
                    $indexPerempuan++;
                } elseif ($indexLaki < count($namaLaki)) {
                    $nama = $namaLaki[$indexLaki];
                    $jk = 'L';
                    $indexLaki++;
                } else {
                    $nama = $namaPerempuan[$indexPerempuan % count($namaPerempuan)];
                    $jk = 'P';
                    $indexPerempuan++;
                }

                $tahunLahir = $config['tahun_lahir'][array_rand($config['tahun_lahir'])];
                $bulan = str_pad(rand(1, 12), 2, '0', STR_PAD_LEFT);
                $tanggal = str_pad(rand(1, 28), 2, '0', STR_PAD_LEFT);
                $kota = $kotaLahir[array_rand($kotaLahir)];
                $sekolah = $asalSekolah[array_rand($asalSekolah)] . ' ' . $kota;
                $alamatSiswa = $alamat[array_rand($alamat)] . rand(1, 150);

                $data[] = [
                    'nama' => $nama,
                    'status' => 'Aktif',
                    'nis' => (string) $nis,
                    'nisn' => '00' . rand(10000000, 99999999),
                    'kelas_id' => $kelas[$namaKelas],
                    'jenis_kelamin' => $jk,
                    'alamat' => $alamatSiswa,
                    'tanggal_lahir' => "$tahunLahir-$bulan-$tanggal",
                    'tempat_lahir' => $kota,
                    'asal_sekolah' => $sekolah,
                    'kontak_ortu' => '08' . rand(1000000000, 9999999999),
                    'created_at' => now(),
                    'updated_at' => now(),
                ];

                $nis++;
            }
        }

        // Insert all data
        foreach ($data as $item) {
            DB::table('siswa')->insert($item);
        }
    }
}
