<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Siswa;
use App\Models\Kelas;
use Illuminate\Support\Facades\DB;

class RealSiswaSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->command->info('Menghapus data siswa dummy...');

        // Disable FK checks and truncate
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        Siswa::truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        $this->command->info('Mengimport data siswa baru...');

        // Map kelas tingkat to kelas_id
        $kelasMap = [];
        $kelasList = Kelas::all();
        foreach ($kelasList as $kelas) {
            $kelasMap[$kelas->tingkat] = $kelas->id;
        }

        // Helper to parse date
        $parseDate = function ($dateStr) {
            if (!$dateStr)
                return null;
            // Handle d/m/y format
            $parts = explode('/', $dateStr);
            if (count($parts) === 3) {
                $day = (int) $parts[0];
                $month = (int) $parts[1];
                $year = (int) $parts[2];
                // If year is 2 digits, assume 2000s
                if ($year < 100)
                    $year += 2000;
                return sprintf('%04d-%02d-%02d', $year, $month, $day);
            }
            return null;
        };

        // Helper to parse NISN - skip because Excel data has scientific notation issues
        // and all values convert to the same number causing duplicate errors
        $parseNisn = function ($nisn) {
            return null; // Skip NISN import
        };

        $siswaData = [
            ['AGUNG BINTANG TAMWIFI', 'Aktif', '1.3123326001524E+17', '70212823', 'XI', 'Laki-laki', 'Sapugarut, Buaran, Pekalongan', '27/12/2006', 'Pekalongan', 'SMP N 1 Kedungwuni', 'Zamroni', 'Sri Muti`ah', '85800028814'],
            ['AHMAD DWI FERDIANTORO', 'Aktif', '1.3123326001524E+17', '71295614', 'XI', 'Laki-laki', 'Kemiri, Wonopringgo, Pekalongan', '1/9/2007', 'Pekalongan', 'SMPN 1 KARANGDADAP', 'JUMADI', 'NASIKHAH', '82327689177'],
            ['AHMAD MUHSIN', 'Aktif', '1.3123326001524E+17', '75917696', 'XI', 'Laki-laki', 'Karangsari, Karanganyar, Pekalongan', '15/03/2008', 'Pekalongan', 'Al Irsyad', null, null, null],
            ['AKHMAD ABIYAN ZAHIR', 'Aktif', '1.3123326001524E+17', '72015693', 'XI', 'Laki-laki', 'Kampung Baru, Subah, Batang', '14/10/2007', 'Batang', 'SMP NU Pajomblangan', 'Abdul Fatah', 'Sofi\'atun', '85726757747'],
            ['ALDINO PUTRA PRATAMA', 'Aktif', '1.3123326001524E+17', '75755093', 'XI', 'Laki-laki', 'Tengeng Wetan, Tengeng, Pekalongan', '2/5/2008', 'Pekalongan', 'MTs Miftahul Huda', 'NUR ROKHIM', 'NAELA NUR', null],
            ['DEANIS MOZA AULIA', 'Aktif', '1.3123326001524E+17', '77556795', 'XI', 'Perempuan', 'Karangsari, Karanganyar, Pekalongan', '18/06/2008', 'Pekalongan', 'SMP NU BP Pajomblangan', 'Tofik Hidayat', 'Dwi Rokhayati', '85729298081'],
            ['FAIZAL MIFTAKHUL FAJRI', 'Aktif', '1.3123326001524E+17', '76028817', 'XI', 'Laki-laki', 'Desa Kertijayan, Buaran, Pekalongan', '3/9/2007', 'Pekalongan', 'MTs Miftahul Huda', 'FATONI', 'SUMIARNI', null],
            ['FAUZAN KHAER ROHMANI', 'Aktif', '1.3123326001524E+17', '70212819', 'XI', 'Laki-laki', 'Cibuyur, Warungpiring, Pemalang', '14/09/2007', 'Pemalang', 'MTS BUSTANUSSYAKIRIN PEMALANG', 'ASRONI', 'JUNITA', '81225566690'],
            ['IKFINA MAFTAHATUL JANNAH', 'Aktif', '1.3123326001524E+17', '75818789', 'XI', 'Perempuan', 'Sugihwaras, Pemalang, Pemalang', '3/6/2007', 'Pemalang', 'MTs Bustanus Syakirin', 'MOH IRHAM', 'MUAROMATUN M', '81326867000'],
            ['M. IRHAM NUR HIDAYAT', 'Aktif', '1.3123326001524E+17', '76612826', 'XI', 'Laki-laki', 'Pekajangan, Kedungwuni, Pekalongan', '7/6/2008', 'Pekalongan', 'MTS. MIFTAHUL HUDA', 'Kisworo', 'Daryatun', '85947420072'],
            ['MIFTAHUL HUDA SYADIDAN MUBAROK', 'Aktif', '1.3123326001524E+17', '73052199', 'XI', 'Laki-laki', 'Pajomblangan, Kedungwuni, Pekalongan', '16/01/2008', 'Pekalongan', 'SMP NU Pajomblangan', 'Imam Turmudzi', 'Mufrotul M', null],
            ['MUHAMMAD MIFTAKUL MUNIR', 'Aktif', '1.3123326001524E+17', '71792813', 'XI', 'Laki-laki', 'Pajomblangan, Kedungwuni, Pekalongan', '2/2/2008', 'Pekalongan', 'SMP NU Pajomblangan', 'MUKHSON', 'ULYA SAADAH', null],
            ['RAHMAD NUR FAUZI', 'Aktif', '1.3123326001524E+17', '73052203', 'XI', 'Laki-laki', 'Pajomblangan, Kedungwuni, Pekalongan', '17/04/2008', 'Pekalongan', 'SMP NU Pajomblangan', 'Bahrudin', 'Istiqomah', null],
            ['ZA`ROFATUL `ALIYAH', 'Aktif', '1.3123326001524E+17', '70212828', 'XI', 'Perempuan', 'Tejosari, Petarukan, Pemalang', '20/04/2008', 'Pemalang', 'SMP AL-HIKMAH MAYONG JEPARA', 'MUKHTAR', 'SITI FATKHIYAH', '81225566690'],
            ['M. ZAHRUL MUBAROK', 'Aktif', '1.3123326001524E+17', '3111428089', 'XI', 'Laki-laki', 'Desa Pandansari, Sragi, Pekalongan', '9/12/2009', 'Pekalongan', 'MTS AL-QUDSIYYAH KALIWUNGU KUDUS', 'MASHURI', 'KHUSNUL KOTIMAH', '85325312098'],
            ['AGIL AZYZA FALIH', 'Aktif', '1.3123326001523E+17', '84015313', 'XII', 'Laki-laki', 'Karangsari, Karanganyar, Pekalongan', '21/09/2008', 'Pekalongan', 'SMP NU BP Pajomblangan', 'Ahmad Nasri', 'Iis Rahaningsih', null],
            ['AINURROHMAH OKTAVIA R', 'Aktif', '1.3123326001523E+17', '72525889', 'XII', 'Perempuan', 'Pajomblangan, Kedungwuni, Pekalongan', '23/10/2007', 'Pekalongan', 'SMP Islam Wonopringgo', null, null, null],
            ['ALYA SYAKIRIN', 'Aktif', '1.3123326001523E+17', '73052198', 'XII', 'Perempuan', 'Pajomblangan, Kedungwuni, Pekalongan', '1/3/2008', 'Pekalongan', 'SMP NU Pajomblangan', null, 'Siti Nur Khasanah', null],
            ['ARDIANSYAH FIRDAUS', 'Aktif', '1.3123326001523E+17', '75985736', 'XII', 'Laki-laki', 'Petarukan, Petarukan, Pemalang', '8/12/2007', 'Pemalang', 'SMP NU Pajomblangan', 'SUHARSONO', 'RIRIN RETNOWATI', '85610911071'],
            ['DAFFA AL FAREZA ADITIA', 'Aktif', '1.3123326001523E+17', '89789714', 'XII', 'Laki-laki', 'Jenggot, Pekalongan Selatan, Kota Pekalongan', '19/02/2008', 'Pekalongan', 'Pondok darul amanah kendl.', 'Abdul hadi', 'Titin kahsanah', '816412396'],
            ['DIAN FARUQ AL LATIF', 'Aktif', '1.3123326001523E+17', '72526548', 'XII', 'Laki-laki', 'Pesaren, Warungasem, Batang', '3/5/2007', 'Batang', 'Mts', 'Muh Tadi', 'Supriyani', null],
            ['DIMAS IBRAHIM ARRUHAM', 'Aktif', '1.3123326001523E+17', '85268101', 'XII', 'Laki-laki', 'Kedungwuni Timur, Kedungwuni, Pekalongan', '13/04/2008', 'Pekalongan', 'SMP NU Pajomblangan', 'Didi Madhari', 'isticharoh', '62 81574224238'],
            ['DINDA KHALIMATUS SABILAH', 'Aktif', '1.3123326001523E+17', '88347192', 'XII', 'Perempuan', 'Pajomblangan, Kedungwuni, Pekalongan', '6/7/2008', 'Pekalongan', 'Smp NU pajomblangan', null, null, null],
            ['FARAS MEISABILA', 'Aktif', '1.3123326001523E+17', '89796326', 'XII', 'Perempuan', 'Pasir, Bodeh, Pemalang', '19/05/2008', 'Pemalang', 'MtsS Daarul Istiqomah Pasir', 'Mohammad Azim', 'Nita januari', null],
            ['FATHONI ANANDYA', 'Aktif', '1.3123326001523E+17', '73695111', 'XII', 'Laki-laki', 'Palmerah, Palmerah, Jakarta Barat', '10/10/2007', 'Jakarta', 'SMPN 101 JAKARTA', 'MASDUKI', 'TUMINI', '81517575732'],
            ['FATIMATUS ZAHRO', 'Aktif', '1.3123326001523E+17', '74159187', 'XII', 'Perempuan', 'Klidang Wetan, Batang, Batang', '6/1/2009', 'Batang', 'smp nu pajomblangan', 'Ali Bahrudin', 'Fauzizah', null],
            ['HANI ZHAFIRA KHOERUNISA', 'Aktif', '1.3123326001523E+17', '81790344', 'XII', 'Perempuan', 'Pedurungan, Taman, Pemalang', '11/11/2008', 'Pemalang', 'SMP NU Pajomblangan', 'Rifai Yusup', 'Indah Winarni', '87810022775'],
            ['JELITA ALIFIA PUTRI SUTISNA', 'Aktif', '1.3123326001523E+17', '84866010', 'XII', 'Perempuan', 'Jebed Selatan, Taman, Pemalang', '23/08/2008', 'Pemalang', 'Kedungwuni', 'Ari sutisna', 'Damurah', '8568187410'],
            ['LUKMANUL CHAKIM', 'Aktif', '1.3123326001523E+17', '131651819', 'XII', 'Laki-laki', null, '15/04/2007', 'Pemalang', null, null, null, null],
            ['M. RIFQI', 'Aktif', '1.3123326001523E+17', '79002678', 'XII', 'Laki-laki', 'Tangkil Kulon, Kedungwuni, Pekalongan', '26/07/2007', 'Pekalongan', 'SMP N 1 Buaran', 'Riyanto', 'Nafsiyah', '81575578381'],
            ['MAY LAVA SEVENTEEN', 'Aktif', '1.3123326001523E+17', '67656885', 'XII', 'Perempuan', 'Podo, Kedungwuni, Pekalongan', '17/05/2006', 'Pekalongan', 'SMP NU BP Pajomblangan', null, 'Hartutik', null],
            ['MUHAMMAD AGENG', 'Aktif', '1.3123326001523E+17', '81250154', 'XII', 'Laki-laki', null, '20/11/2008', 'Pekalongan', 'SMPN 1 Buaran Pekalongan', 'EFENDI', 'SITI MUFRODAH', '85640447373'],
            ['PRABU ASTAGINA HANGGA DWIPA', 'Aktif', '1.3123326001523E+17', null, 'XII', null, null, null, null, null, null, null, null],
            ['AHMAD AGUNG SETIYAWAN', 'Aktif', '1.3123326001525E+17', '96527144', 'X', 'Laki-laki', 'Harjosari, Doro, Pekalongan', '2/9/2009', 'PEKALONGAN', 'SMP NU PAJOMBLANGAN', 'ULFIYADI', 'NURWATI', '81329837785'],
            ['AHMAD IRFANSYAH', 'Aktif', '1.3123326001525E+17', '104050111', 'X', 'Laki-laki', 'Desa Ambowetan RT 05/02, Ulujami, Pemalang', '4/5/2010', 'Pemalang', 'SMP NU Pajomblangan', 'WINARTO', 'YULI RATNASARI', '85601902630'],
            ['M NABIL RIZIQ', 'Aktif', '1.3123326001525E+17', '84154118', 'X', 'Laki-laki', 'Desa Krapyak, Pekalongan Utara, Kota Pekalongan', '28/03/2008', 'PEKALONGAN', null, 'AHMAD BESAR', 'ISTI QOMAH', '85972551153'],
            ['MUHAMMAD ALFAN HAMID', 'Aktif', '1.3123326001525E+17', '106700796', 'X', 'Laki-laki', 'Jl. Singo Bongso, Bugangan, Kedungwuni, Pekalongan', '18/10/2010', 'Pekalongan kedungwuni', 'SMP NU Pajomblangan', 'Abdul Khamid', 'Istikomah', '85642294252'],
            ['MUHAMMAD ISHAQUL HIMAM', 'Aktif', '1.3123326001525E+17', '3100940782', 'X', 'Laki-laki', 'Desa Tasikrejo RT 004/006, Ulujami, Pemalang', '30/06/2010', 'Pemalang', 'SMP N 4 Ulujami', 'Surono', 'Nur Asiyah', '895377292792'],
            ['RIZQA HIMMATUL ULYA', 'Aktif', '1.3123326001525E+17', '3108371171', 'X', 'Perempuan', 'Desa Getas, Wonopringgo, Pekalongan', '15/11/2010', 'Pekalongan', 'SMP NU Pajomblangan', 'RIZQON', 'BARKAH', null],
            ['SANIA RACHMA RAMADHANI', 'Aktif', '1.3123326001525E+17', '107560893', 'X', 'Perempuan', 'Desa Jenggot, Pekalongan Selatan, Kota Pekalongan', '22/02/2010', 'Pekalongan', 'SMP NU Pajomblangan', 'A. ROMADHON', 'NUR LISZAH', null],
            ['MEI FIANU', 'Aktif', '1.3123326001525E+17', '107617894', 'X', 'Perempuan', 'Tegalmlati RT 07 RW 04, Petarukan, Pemalang', '15/05/2010', 'Pemalang', 'SMP NU Pajomblangan', 'FITRI RAHARJO', 'AFIANA', null],
            ['MUHAMMAD AFRIZA LUTHFI MA', 'Aktif', '1.3123326001525E+17', '3095568239', 'X', 'Laki-laki', 'Donowangun, Talun, Pekalongan', null, 'Pemalang', 'SMP NU Pajomblangan', 'Nasrudin', 'Barozah', null],
        ];

        $imported = 0;
        foreach ($siswaData as $row) {
            // Skip empty rows
            if (empty($row[0]))
                continue;

            // Skip rows with no NIS (required field)
            if (empty($row[3])) {
                $this->command->warn("⚠ Skipping {$row[0]} - NIS tidak tersedia");
                continue;
            }

            $nama = $row[0];
            $status = $row[1] ?? 'Aktif';
            $nisn = $parseNisn($row[2]);
            $nis = $row[3];
            $tingkat = $row[4];
            $jk = ($row[5] ?? 'Laki-laki') === 'Perempuan' ? 'P' : 'L';
            $alamat = $row[6];
            $tglLahir = $parseDate($row[7]);
            $tmptLahir = $row[8];
            $asalSekolah = $row[9];
            $namaAyah = $row[10];
            $namaIbu = $row[11];
            $kontakOrtu = $row[12];

            // Get kelas_id from tingkat
            $kelasId = $kelasMap[$tingkat] ?? null;

            if (!$kelasId) {
                $this->command->warn("⚠ Kelas '$tingkat' tidak ditemukan untuk siswa $nama");
            }

            Siswa::create([
                'nama' => $nama,
                'status' => $status,
                'nisn' => $nisn,
                'nis' => $nis,
                'kelas_id' => $kelasId,
                'jenis_kelamin' => $jk,
                'alamat' => $alamat,
                'tanggal_lahir' => $tglLahir,
                'tempat_lahir' => $tmptLahir,
                'asal_sekolah' => $asalSekolah,
                'nama_ayah' => $namaAyah,
                'nama_ibu' => $namaIbu,
                'kontak_ortu' => $kontakOrtu,
            ]);

            $imported++;
            $this->command->info("✓ Imported: $nama");
        }

        $this->command->info("\n✅ Berhasil import $imported data siswa!");
    }
}
