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
        // MySQL doesn't allow direct ENUM modification, so we use raw SQL
        DB::statement("ALTER TABLE absensi_mengajar MODIFY COLUMN guru_status ENUM('H', 'I', 'A') DEFAULT 'H'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert back to original ENUM values
        // Note: This will fail if there are any 'A' values in the column
        DB::statement("ALTER TABLE absensi_mengajar MODIFY COLUMN guru_status ENUM('H', 'I') DEFAULT 'H'");
    }
};
