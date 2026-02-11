<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Add snapshot columns to store siswa attendance counts at the moment
     * each guru saves attendance. This allows the jurnal to show per-mapel
     * attendance even though absensi_siswa is stored per-day.
     */
    public function up(): void
    {
        Schema::table('absensi_mengajar', function (Blueprint $table) {
            $table->unsignedSmallInteger('siswa_hadir')->default(0)->after('guru_tugas_id');
            $table->unsignedSmallInteger('siswa_sakit')->default(0)->after('siswa_hadir');
            $table->unsignedSmallInteger('siswa_izin')->default(0)->after('siswa_sakit');
            $table->unsignedSmallInteger('siswa_alpha')->default(0)->after('siswa_izin');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('absensi_mengajar', function (Blueprint $table) {
            $table->dropColumn(['siswa_hadir', 'siswa_sakit', 'siswa_izin', 'siswa_alpha']);
        });
    }
};
