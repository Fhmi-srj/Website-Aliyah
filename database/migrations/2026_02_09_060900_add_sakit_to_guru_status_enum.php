<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Add 'S' (Sakit/Sick) to guru_status enum
        DB::statement("ALTER TABLE absensi_mengajar MODIFY COLUMN guru_status ENUM('H', 'S', 'I', 'A') DEFAULT 'H'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Remove 'S' from enum (rollback)
        DB::statement("ALTER TABLE absensi_mengajar MODIFY COLUMN guru_status ENUM('H', 'I', 'A') DEFAULT 'H'");
    }
};
