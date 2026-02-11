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
        // Use raw SQL to safely modify the table structure
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');

        // Drop existing foreign key and unique constraint
        try {
            DB::statement('ALTER TABLE absensi_mengajar DROP FOREIGN KEY absensi_mengajar_jadwal_id_foreign');
        } catch (\Exception $e) {
            // FK might not exist with that name
        }

        try {
            DB::statement('ALTER TABLE absensi_mengajar DROP INDEX absensi_mengajar_jadwal_id_tanggal_unique');
        } catch (\Exception $e) {
            // Index might not exist
        }

        // Make jadwal_id nullable
        DB::statement('ALTER TABLE absensi_mengajar MODIFY jadwal_id BIGINT UNSIGNED NULL');

        // Re-add foreign key with nullable support (on delete set null)
        DB::statement('ALTER TABLE absensi_mengajar ADD CONSTRAINT absensi_mengajar_jadwal_id_foreign FOREIGN KEY (jadwal_id) REFERENCES jadwal(id) ON DELETE SET NULL');

        // Add new unique constraint (guru + tanggal + kelas + mapel)
        try {
            DB::statement('ALTER TABLE absensi_mengajar ADD UNIQUE INDEX unique_absensi_mengajar (guru_id, tanggal, snapshot_kelas, snapshot_mapel)');
        } catch (\Exception $e) {
            // Index might already exist
        }

        DB::statement('SET FOREIGN_KEY_CHECKS=1;');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');

        // Remove new unique
        try {
            DB::statement('ALTER TABLE absensi_mengajar DROP INDEX unique_absensi_mengajar');
        } catch (\Exception $e) {
        }

        // Drop FK
        try {
            DB::statement('ALTER TABLE absensi_mengajar DROP FOREIGN KEY absensi_mengajar_jadwal_id_foreign');
        } catch (\Exception $e) {
        }

        // Make jadwal_id not null again
        DB::statement('ALTER TABLE absensi_mengajar MODIFY jadwal_id BIGINT UNSIGNED NOT NULL');

        // Re-add original FK
        DB::statement('ALTER TABLE absensi_mengajar ADD CONSTRAINT absensi_mengajar_jadwal_id_foreign FOREIGN KEY (jadwal_id) REFERENCES jadwal(id) ON DELETE CASCADE');

        // Re-add original unique constraint
        DB::statement('ALTER TABLE absensi_mengajar ADD UNIQUE INDEX absensi_mengajar_jadwal_id_tanggal_unique (jadwal_id, tanggal)');

        DB::statement('SET FOREIGN_KEY_CHECKS=1;');
    }
};
