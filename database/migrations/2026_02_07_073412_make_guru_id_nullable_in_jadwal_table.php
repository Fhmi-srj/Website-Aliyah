<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('jadwal', function (Blueprint $table) {
            // Make guru_id nullable to allow "Semua Guru" (all teachers) schedules
            $table->foreignId('guru_id')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('jadwal', function (Blueprint $table) {
            // Note: This will fail if there are null values in the column
            $table->foreignId('guru_id')->nullable(false)->change();
        });
    }
};
