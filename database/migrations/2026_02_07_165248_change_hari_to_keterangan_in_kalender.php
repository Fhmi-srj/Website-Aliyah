<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Modify enum to use 'Keterangan' instead of 'Hari'
        DB::statement("ALTER TABLE kalender MODIFY COLUMN keterangan ENUM('Kegiatan', 'Libur', 'Keterangan') DEFAULT 'Kegiatan'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert to previous enum with 'Hari'
        DB::statement("ALTER TABLE kalender MODIFY COLUMN keterangan ENUM('Kegiatan', 'Libur', 'Hari') DEFAULT 'Kegiatan'");
    }
};
