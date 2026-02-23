<?php

use Illuminate\Database\Migrations\Migration;
use App\Models\BisyarohSetting;

return new class extends Migration {
    public function up(): void
    {
        // Only seed if the table is empty (safe for re-run)
        if (BisyarohSetting::count() > 0) {
            return;
        }

        $settings = [
            // Tarif Dasar
            ['key' => 'bisyaroh_per_jam', 'value' => '30000', 'type' => 'integer', 'category' => 'tarif_dasar', 'label' => 'Bisyaroh Per Jam', 'sort_order' => 1],
            ['key' => 'transport_per_hadir', 'value' => '7500', 'type' => 'integer', 'category' => 'tarif_dasar', 'label' => 'Transport Per Hadir', 'sort_order' => 2],
            ['key' => 'tunjangan_masa_kerja_per_tahun', 'value' => '5000', 'type' => 'integer', 'category' => 'tarif_dasar', 'label' => 'Tunjangan Masa Kerja Per Tahun', 'sort_order' => 3],

            // Tunjangan Jabatan
            ['key' => 'tunj_kepala_madrasah', 'value' => '0', 'type' => 'integer', 'category' => 'tunjangan_jabatan', 'label' => 'Kepala Madrasah', 'sort_order' => 1],
            ['key' => 'tunj_tata_administrasi_i', 'value' => '0', 'type' => 'integer', 'category' => 'tunjangan_jabatan', 'label' => 'Tata Administrasi I', 'sort_order' => 2],
            ['key' => 'tunj_tata_administrasi_ii', 'value' => '0', 'type' => 'integer', 'category' => 'tunjangan_jabatan', 'label' => 'Tata Administrasi II', 'sort_order' => 3],
            ['key' => 'tunj_waka_kurikulum', 'value' => '0', 'type' => 'integer', 'category' => 'tunjangan_jabatan', 'label' => 'Waka Kurikulum', 'sort_order' => 4],
            ['key' => 'tunj_waka_kesiswaan', 'value' => '0', 'type' => 'integer', 'category' => 'tunjangan_jabatan', 'label' => 'Waka Kesiswaan', 'sort_order' => 5],
            ['key' => 'tunj_wali_kelas', 'value' => '0', 'type' => 'integer', 'category' => 'tunjangan_jabatan', 'label' => 'Wali Kelas', 'sort_order' => 6],
            ['key' => 'tunj_proktor_anbk', 'value' => '0', 'type' => 'integer', 'category' => 'tunjangan_jabatan', 'label' => 'Proktor ANBK', 'sort_order' => 7],
            ['key' => 'tunj_teknisi_anbk', 'value' => '0', 'type' => 'integer', 'category' => 'tunjangan_jabatan', 'label' => 'Teknisi ANBK', 'sort_order' => 8],

            // Tunjangan Kegiatan & Rapat
            ['key' => 'tunj_koordinator_kegiatan', 'value' => '0', 'type' => 'integer', 'category' => 'tunjangan_kegiatan', 'label' => 'Koordinator Kegiatan', 'sort_order' => 1],
            ['key' => 'tunj_pendamping_kegiatan', 'value' => '0', 'type' => 'integer', 'category' => 'tunjangan_kegiatan', 'label' => 'Pendamping Kegiatan', 'sort_order' => 2],
            ['key' => 'tunj_rapat', 'value' => '0', 'type' => 'integer', 'category' => 'tunjangan_kegiatan', 'label' => 'Rapat', 'sort_order' => 3],

            // Potongan
            ['key' => 'potongan_arisan', 'value' => '20000', 'type' => 'integer', 'category' => 'potongan', 'label' => 'Arisan', 'sort_order' => 1],
        ];

        foreach ($settings as $setting) {
            BisyarohSetting::create($setting);
        }
    }

    public function down(): void
    {
        // Don't delete settings on rollback — they may have been customized
    }
};
