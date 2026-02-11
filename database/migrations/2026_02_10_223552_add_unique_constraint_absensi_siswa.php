<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     * Add unique constraint to prevent duplicate per-day attendance records.
     * In the per-day system, each student can only have one attendance status per day.
     */
    public function up(): void
    {
        Schema::table('absensi_siswa', function (Blueprint $table) {
            $table->unique(['siswa_id', 'tanggal'], 'absensi_siswa_unique_per_day');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('absensi_siswa', function (Blueprint $table) {
            $table->dropUnique('absensi_siswa_unique_per_day');
        });
    }
};
