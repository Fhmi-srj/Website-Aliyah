<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Guru;
use App\Models\User;
use App\Models\Role;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

class RealGuruSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Truncate existing guru and related users (except superadmin)
        $this->command->info('Menghapus data guru dummy...');

        // Clear wali_kelas references first
        \App\Models\Kelas::query()->update(['wali_kelas_id' => null]);

        // Get all guru user_ids first
        $guruUserIds = Guru::pluck('user_id')->filter()->toArray();

        // Disable FK checks and delete guru records
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        Guru::truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        // Delete users that were linked to guru (except superadmin)
        User::whereIn('id', $guruUserIds)->delete();

        // Also delete any users that match the usernames we're about to create
        $usernamesToCreate = [
            'adibkaromi',
            'zaenalabidin',
            'akromadabi',
            'sirotnur',
            'maafi',
            'didimadhari',
            'muammal',
            'dewi',
            'syahrulghani',
            'ismailsaleh',
            'agusamin',
            'ariefarfan',
            'rinomukti',
            'irham',
            'muntaha',
            'fathina'
        ];
        User::whereIn('username', $usernamesToCreate)->delete();

        $this->command->info('Mengimport data guru baru...');

        // Get guru role
        $guruRole = Role::where('name', 'guru')->first();

        $guruData = [
            [
                'username' => 'adibkaromi',
                'nama' => 'Adib Karomi, S.Pd.I.',
                'nip' => '202007010001',
                'sk' => '011/001/003/VI/2023',
                'jenis_kelamin' => 'L',
                'pendidikan' => 'S1',
                'alamat' => 'Pajomblangan, Kedungwuni, Pekalongan',
                'tempat_lahir' => 'Pekalongan',
                'tanggal_lahir' => '1965-08-14',
                'kontak' => '6285876667810',
                'tmt' => '2020-07-01',
                'status' => 'Aktif',
            ],
            [
                'username' => 'zaenalabidin',
                'nama' => 'M. Zaenal Abidin',
                'nip' => '202007010002',
                'sk' => '012/001/003/VI/2023',
                'jenis_kelamin' => 'L',
                'pendidikan' => 'SMK',
                'alamat' => 'Pajomblangan, Kedungwuni, Pekalongan',
                'tempat_lahir' => 'Pekalongan',
                'tanggal_lahir' => '1993-10-10',
                'kontak' => '6285641664979',
                'tmt' => '2020-07-01',
                'status' => 'Aktif',
            ],
            [
                'username' => 'akromadabi',
                'nama' => 'Muhammad Akrom Adabi, M.Ag.',
                'nip' => '202007010003',
                'sk' => '013/001/003/VI/2023',
                'jenis_kelamin' => 'L',
                'pendidikan' => 'S2',
                'alamat' => 'Pajomblangan, Kedungwuni, Pekalongan',
                'tempat_lahir' => 'Pekalongan',
                'tanggal_lahir' => '1995-01-17',
                'kontak' => '6285641647478',
                'tmt' => '2020-07-01',
                'status' => 'Aktif',
            ],
            [
                'username' => 'sirotnur',
                'nama' => 'M. Ihdisyiroth Nur, S.Pd.',
                'nip' => '202007010004',
                'sk' => '014/YAM/MA/VII/2020',
                'jenis_kelamin' => 'L',
                'pendidikan' => 'S1',
                'alamat' => 'Pajomblangan, Kedungwuni, Pekalongan',
                'tempat_lahir' => 'Pekalongan',
                'tanggal_lahir' => '1997-10-19',
                'kontak' => '6282322632283',
                'tmt' => '2020-07-01',
                'status' => 'Aktif',
            ],
            [
                'username' => 'maafi',
                'nama' => 'Maafi, S.Pd.',
                'nip' => '202007010005',
                'sk' => '015/001/003/VI/2023',
                'jenis_kelamin' => 'L',
                'pendidikan' => 'S1',
                'alamat' => 'Pajomblangan, Kedungwuni, Pekalongan',
                'tempat_lahir' => 'Pekalongan',
                'tanggal_lahir' => '1981-12-15',
                'kontak' => '6285842071471',
                'tmt' => '2020-07-01',
                'status' => 'Aktif',
            ],
            [
                'username' => 'didimadhari',
                'nama' => 'Didi Madhari',
                'nip' => '202007010006',
                'sk' => '016/001/003/VI/2023',
                'jenis_kelamin' => 'L',
                'pendidikan' => 'SMA',
                'alamat' => 'Capgawen Utara, Kedungwuni, Pekalongan',
                'tempat_lahir' => 'Majalengka',
                'tanggal_lahir' => '1978-07-12',
                'kontak' => '6281574224238',
                'tmt' => '2020-07-01',
                'status' => 'Aktif',
            ],
            [
                'username' => 'muammal',
                'nama' => 'M. Muammal',
                'nip' => '202007010007',
                'sk' => '017/001/003/VI/2023',
                'jenis_kelamin' => 'L',
                'pendidikan' => 'MA',
                'alamat' => 'Pajomblangan, Kedungwuni, Pekalongan',
                'tempat_lahir' => 'Kendal',
                'tanggal_lahir' => '1987-09-18',
                'kontak' => '6285879686800',
                'tmt' => '2020-07-01',
                'status' => 'Aktif',
            ],
            [
                'username' => 'dewi',
                'nama' => 'Dewi Rokhillah Faukillah, S.Pd',
                'nip' => '202007010008',
                'sk' => '018/001/003/VII/2023',
                'jenis_kelamin' => 'P',
                'pendidikan' => 'S1',
                'alamat' => 'Kertijayan, Buaran, Pekalongan',
                'tempat_lahir' => 'Pekalongan',
                'tanggal_lahir' => '1997-08-15',
                'kontak' => '6285878736675',
                'tmt' => '2020-07-01',
                'status' => 'Aktif',
            ],
            [
                'username' => 'syahrulghani',
                'nama' => 'Syahrul Adlul Gani',
                'nip' => '202007010009',
                'sk' => '019/001/003/VI/2023',
                'jenis_kelamin' => 'L',
                'pendidikan' => 'S1',
                'alamat' => 'Karangsari, Karanganyar, Pekalongan',
                'tempat_lahir' => 'Pekalongan',
                'tanggal_lahir' => '1993-10-10',
                'kontak' => '6285641856318',
                'tmt' => '2020-07-01',
                'status' => 'Aktif',
            ],
            [
                'username' => 'ismailsaleh',
                'nama' => 'Ismail Saleh, S.Pd',
                'nip' => '202007010010',
                'sk' => '020/001/III/2021',
                'jenis_kelamin' => 'L',
                'pendidikan' => 'S1',
                'alamat' => 'Kejenen Kwayangan, Kedungwuni, Pekalongan',
                'tempat_lahir' => 'Pekalongan',
                'tanggal_lahir' => '1989-04-27',
                'kontak' => '6285842554992',
                'tmt' => '2020-07-01',
                'status' => 'Aktif',
            ],
            [
                'username' => 'agusamin',
                'nama' => 'Agus Amin, S.Ag',
                'nip' => '202407180011',
                'sk' => '021/001/003/VI/2024',
                'jenis_kelamin' => 'P', // Note: Excel says Perempuan but name suggests male - keeping as per Excel
                'pendidikan' => 'S1',
                'alamat' => 'Jenggot, Pekalongan Selatan',
                'tempat_lahir' => 'Pekalongan',
                'tanggal_lahir' => '1998-08-22',
                'kontak' => '6285802250670',
                'tmt' => '2024-07-18',
                'status' => 'Aktif',
            ],
            [
                'username' => 'ariefarfan',
                'nama' => 'M. Arief Arfan, S.Pd.',
                'nip' => '202107200012',
                'sk' => '022/001/003/VII/2021',
                'jenis_kelamin' => 'L',
                'pendidikan' => 'S1',
                'alamat' => 'Wiroditan, Bojong, Pekalongan',
                'tempat_lahir' => 'Pekalongan',
                'tanggal_lahir' => '1991-08-29',
                'kontak' => '6285878642001',
                'tmt' => '2021-07-20',
                'status' => 'Aktif',
            ],
            [
                'username' => 'rinomukti',
                'nama' => 'Rino Mukti, S. Pd',
                'nip' => '202107180013',
                'sk' => '023/08.03/VI/2021',
                'jenis_kelamin' => 'L',
                'pendidikan' => 'S1',
                'alamat' => 'Pajomblangan, Kedungwuni, Pekalongan',
                'tempat_lahir' => 'Pekalongan',
                'tanggal_lahir' => '1990-10-10',
                'kontak' => '6285742786709',
                'tmt' => '2021-07-18',
                'status' => 'Aktif',
            ],
            [
                'username' => 'irham',
                'nama' => 'Muhammad Irham',
                'nip' => '202407200014',
                'sk' => '024/001/003/VI/2024',
                'jenis_kelamin' => 'L',
                'pendidikan' => 'SMA',
                'alamat' => 'Karangdowo, Kedungwuni, Pekalongan',
                'tempat_lahir' => 'Pekalongan',
                'tanggal_lahir' => '1988-07-25',
                'kontak' => '6285800060877',
                'tmt' => '2024-07-20',
                'status' => 'Aktif',
            ],
            [
                'username' => 'muntaha',
                'nama' => 'Muhammad Muntaha',
                'nip' => '202507120015',
                'sk' => '031/001/005/I/2025',
                'jenis_kelamin' => 'L',
                'pendidikan' => 'S2',
                'alamat' => 'Pajomblangan, Kedungwuni, Pekalongan',
                'tempat_lahir' => 'Pekalongan',
                'tanggal_lahir' => '1995-01-23',
                'kontak' => '6285729982292',
                'tmt' => '2025-07-12',
                'status' => 'Aktif',
            ],
            [
                'username' => 'fathina',
                'nama' => 'Dewi Fathina Adiba',
                'nip' => '202501060016',
                'sk' => '030/001/005/I/2025',
                'jenis_kelamin' => 'P',
                'pendidikan' => 'SMA',
                'alamat' => 'Dukuh Pajomblangan RT 01 RW 02',
                'tempat_lahir' => 'Batang',
                'tanggal_lahir' => '2003-03-02',
                'kontak' => '089012345678',
                'tmt' => '2025-01-06',
                'status' => 'Aktif',
            ],
        ];

        foreach ($guruData as $data) {
            // Create user account
            $user = User::create([
                'name' => $data['nama'],
                'username' => $data['username'],
                'password' => Hash::make('password123'),
                'is_active' => $data['status'] === 'Aktif',
            ]);

            // Assign guru role
            if ($guruRole) {
                $user->roles()->attach($guruRole->id);
            }

            // Create guru record
            Guru::create([
                'user_id' => $user->id,
                'username' => $data['username'],
                'password' => Hash::make('password123'),
                'nama' => $data['nama'],
                'nip' => $data['nip'],
                'sk' => $data['sk'],
                'jenis_kelamin' => $data['jenis_kelamin'],
                'pendidikan' => $data['pendidikan'],
                'alamat' => $data['alamat'],
                'tempat_lahir' => $data['tempat_lahir'],
                'tanggal_lahir' => $data['tanggal_lahir'],
                'kontak' => $data['kontak'],
                'tmt' => $data['tmt'],
                'status' => $data['status'],
            ]);

            $this->command->info("✓ Imported: {$data['nama']}");
        }

        $this->command->info("\n✅ Berhasil import " . count($guruData) . " data guru!");
        $this->command->info("Password default: password123");
    }
}
