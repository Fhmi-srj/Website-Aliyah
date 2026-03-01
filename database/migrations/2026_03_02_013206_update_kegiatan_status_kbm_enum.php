<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    /**
     * Run the migrations.
     * Fix: kegiatan.status_kbm was ENUM('Aktif','Tidak Aktif')
     * but kalender.status_kbm uses ENUM('Aktif','Libur').
     * Align kegiatan to match kalender by using ENUM('Aktif','Libur').
     */
    public function up(): void
    {
        // First convert existing 'Tidak Aktif' values to 'Libur'
        DB::table('kegiatan')->where('status_kbm', 'Tidak Aktif')->update(['status_kbm' => 'Aktif']);

        // Then change the enum to match kalender
        DB::statement("ALTER TABLE kegiatan MODIFY COLUMN status_kbm ENUM('Aktif','Libur') DEFAULT 'Aktif'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("ALTER TABLE kegiatan MODIFY COLUMN status_kbm ENUM('Aktif','Tidak Aktif') DEFAULT 'Aktif'");
    }
};
