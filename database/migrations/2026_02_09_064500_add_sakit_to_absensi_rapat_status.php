<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Add 'S' (Sakit/Sick) to pimpinan_status and sekretaris_status enums
        DB::statement("ALTER TABLE absensi_rapat MODIFY COLUMN pimpinan_status ENUM('H', 'S', 'I', 'A') DEFAULT 'A'");
        DB::statement("ALTER TABLE absensi_rapat MODIFY COLUMN sekretaris_status ENUM('H', 'S', 'I', 'A') DEFAULT 'A'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Remove 'S' from enums (rollback)
        DB::statement("ALTER TABLE absensi_rapat MODIFY COLUMN pimpinan_status ENUM('H', 'I', 'A') DEFAULT 'A'");
        DB::statement("ALTER TABLE absensi_rapat MODIFY COLUMN sekretaris_status ENUM('H', 'I', 'A') DEFAULT 'A'");
    }
};
