<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Modify enum to add 'Hari' option
        DB::statement("ALTER TABLE kalender MODIFY COLUMN keterangan ENUM('Kegiatan', 'Libur', 'Hari') DEFAULT 'Kegiatan'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert to original enum
        DB::statement("ALTER TABLE kalender MODIFY COLUMN keterangan ENUM('Kegiatan', 'Libur') DEFAULT 'Kegiatan'");
    }
};
