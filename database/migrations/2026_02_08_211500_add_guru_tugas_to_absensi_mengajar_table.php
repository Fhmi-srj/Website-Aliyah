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
        Schema::table('absensi_mengajar', function (Blueprint $table) {
            $table->foreignId('guru_tugas_id')->nullable()->after('guru_keterangan')->constrained('guru')->nullOnDelete();
            $table->text('tugas_siswa')->nullable()->after('guru_tugas_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('absensi_mengajar', function (Blueprint $table) {
            $table->dropForeign(['guru_tugas_id']);
            $table->dropColumn(['guru_tugas_id', 'tugas_siswa']);
        });
    }
};
