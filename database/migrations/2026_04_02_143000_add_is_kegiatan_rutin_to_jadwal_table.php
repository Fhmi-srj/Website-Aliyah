<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     * Adds `is_kegiatan_rutin` flag to jadwal table.
     * When true, this schedule applies to ALL active guru (like Upacara, Kamis Sehat)
     * and should be counted toward bisyaroh gaji pokok just like regular teaching hours.
     * Also makes kelas_id nullable since a "rutin" schedule doesn't belong to a single class.
     */
    public function up(): void
    {
        Schema::table('jadwal', function (Blueprint $table) {
            // Flag: apakah jadwal ini adalah kegiatan rutin (Upacara, Kamis Sehat, dll)
            // yang wajib diikuti oleh semua guru aktif
            $table->boolean('is_kegiatan_rutin')->default(false)->after('status');

            // Make kelas_id nullable — kegiatan rutin tidak terikat ke satu kelas
            $table->foreignId('kelas_id')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('jadwal', function (Blueprint $table) {
            $table->dropColumn('is_kegiatan_rutin');
        });
    }
};
