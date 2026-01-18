<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class KelasSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $data = [
            ['nama_kelas' => 'X', 'inisial' => 'X', 'tingkat' => 'X', 'kapasitas' => 35, 'status' => 'Aktif'],
            ['nama_kelas' => 'XI', 'inisial' => 'XI', 'tingkat' => 'XI', 'kapasitas' => 35, 'status' => 'Aktif'],
            ['nama_kelas' => 'XII', 'inisial' => 'XII', 'tingkat' => 'XII', 'kapasitas' => 35, 'status' => 'Aktif'],
        ];

        foreach ($data as $item) {
            DB::table('kelas')->insert(array_merge($item, [
                'created_at' => now(),
                'updated_at' => now(),
            ]));
        }
    }
}
