<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\AppSetting;

class InstitutionSettingsSeeder extends Seeder
{
    /**
     * Seed institution settings.
     */
    public function run(): void
    {
        $settings = [
            [
                'key' => 'nama_lembaga',
                'value' => 'MA Al-Hikam',
                'type' => 'string',
                'description' => 'Nama resmi lembaga/madrasah',
            ],
            [
                'key' => 'logo_lembaga',
                'value' => null,
                'type' => 'string',
                'description' => 'Path logo lembaga (digunakan sebagai logo website)',
            ],
            [
                'key' => 'moto_lembaga',
                'value' => 'Membangun Generasi Qurani yang Berakhlak Mulia',
                'type' => 'string',
                'description' => 'Moto/tagline lembaga (digunakan sebagai meta description dan OG tag)',
            ],
            [
                'key' => 'kop_surat',
                'value' => json_encode([
                    'baris_1' => 'YAYASAN PENDIDIKAN AL-HIKAM',
                    'baris_2' => 'MADRASAH ALIYAH AL-HIKAM',
                    'baris_3' => 'TERAKREDITASI A',
                    'alamat' => 'Jl. Pendidikan No. 123, Kecamatan Contoh, Kabupaten Contoh',
                    'telepon' => '(021) 1234567',
                    'email' => 'info@ma-alhikam.sch.id',
                    'website' => 'www.ma-alhikam.sch.id',
                ]),
                'type' => 'json',
                'description' => 'Konfigurasi kop surat untuk dokumen resmi',
            ],
            [
                'key' => 'alamat_lembaga',
                'value' => 'Jl. Pendidikan No. 123, Kecamatan Contoh, Kabupaten Contoh',
                'type' => 'string',
                'description' => 'Alamat lengkap lembaga',
            ],
            [
                'key' => 'telepon_lembaga',
                'value' => '(021) 1234567',
                'type' => 'string',
                'description' => 'Nomor telepon lembaga',
            ],
            [
                'key' => 'email_lembaga',
                'value' => 'info@ma-alhikam.sch.id',
                'type' => 'string',
                'description' => 'Email resmi lembaga',
            ],
        ];

        foreach ($settings as $setting) {
            AppSetting::updateOrCreate(
                ['key' => $setting['key']],
                [
                    'value' => $setting['value'],
                    'type' => $setting['type'],
                    'description' => $setting['description'],
                ]
            );
        }

        $this->command->info('Institution settings seeded successfully!');
    }
}
