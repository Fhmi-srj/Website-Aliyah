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
        // Modify enum to include Alumni and Mutasi
        DB::statement("ALTER TABLE siswa MODIFY COLUMN status ENUM('Aktif', 'Tidak Aktif', 'Alumni', 'Mutasi') DEFAULT 'Aktif'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert to original enum
        DB::statement("ALTER TABLE siswa MODIFY COLUMN status ENUM('Aktif', 'Tidak Aktif') DEFAULT 'Aktif'");
    }
};
