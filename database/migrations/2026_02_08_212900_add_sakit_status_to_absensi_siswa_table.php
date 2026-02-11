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
        // Modify enum to include 'S' for Sakit
        DB::statement("ALTER TABLE absensi_siswa MODIFY COLUMN status ENUM('H', 'S', 'I', 'A') DEFAULT 'H'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert back to original enum without 'S'
        DB::statement("ALTER TABLE absensi_siswa MODIFY COLUMN status ENUM('H', 'I', 'A') DEFAULT 'H'");
    }
};
