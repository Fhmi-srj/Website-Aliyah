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
        Schema::table('kegiatan', function (Blueprint $table) {
            // Add guru_pendamping column (array of guru IDs)
            $table->json('guru_pendamping')->nullable()->after('penanggung_jawab_id');
            // Add kelas_peserta column (array of kelas IDs)
            $table->json('kelas_peserta')->nullable()->after('peserta');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('kegiatan', function (Blueprint $table) {
            $table->dropColumn(['guru_pendamping', 'kelas_peserta']);
        });
    }
};
