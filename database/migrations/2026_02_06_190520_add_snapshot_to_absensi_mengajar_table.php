<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     * Add snapshot columns to preserve schedule data at the time of attendance
     */
    public function up(): void
    {
        Schema::table('absensi_mengajar', function (Blueprint $table) {
            // Snapshot data - preserves the schedule info when attendance was recorded
            $table->string('snapshot_kelas', 50)->nullable()->after('guru_id');
            $table->string('snapshot_mapel', 100)->nullable()->after('snapshot_kelas');
            $table->string('snapshot_jam', 20)->nullable()->after('snapshot_mapel');
            $table->string('snapshot_hari', 10)->nullable()->after('snapshot_jam');
            $table->string('snapshot_guru_nama', 100)->nullable()->after('snapshot_hari');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('absensi_mengajar', function (Blueprint $table) {
            $table->dropColumn([
                'snapshot_kelas',
                'snapshot_mapel',
                'snapshot_jam',
                'snapshot_hari',
                'snapshot_guru_nama'
            ]);
        });
    }
};
