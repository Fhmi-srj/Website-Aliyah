<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    /**
     * Refactor absensi_siswa from per-mapel to per-day.
     * - Drop absensi_mengajar_id (no longer per-mapel)
     * - Add tanggal + kelas_id (per-day per-class)
     * - Remove 'H' from status enum (only store S/I/A)
     * - Unique constraint on siswa_id + tanggal
     */
    public function up(): void
    {
        // Step 1: Disable FK checks and drop constraints
        DB::statement('SET FOREIGN_KEY_CHECKS=0');

        Schema::table('absensi_siswa', function (Blueprint $table) {
            // Drop foreign key first
            $table->dropForeign(['absensi_mengajar_id']);
        });

        Schema::table('absensi_siswa', function (Blueprint $table) {
            // Then drop unique constraint
            $table->dropUnique(['absensi_mengajar_id', 'siswa_id']);
        });

        DB::statement('SET FOREIGN_KEY_CHECKS=1');

        // Step 2: Add new columns
        Schema::table('absensi_siswa', function (Blueprint $table) {
            $table->date('tanggal')->after('id')->nullable();
            $table->foreignId('kelas_id')->after('tanggal')->nullable()->constrained('kelas')->onDelete('cascade');
        });

        // Step 3: Migrate data - copy tanggal from absensi_mengajar and kelas_id from jadwal/snapshot
        // Get kelas name → id mapping
        $kelasMap = DB::table('kelas')->pluck('id', 'nama_kelas')->toArray();

        // Kelas aliases from Excel snapshot format
        $kelasAliases = [
            'X ( Sepuluh )' => 'X',
            'XI ( Sebelas )' => 'XI',
            'XII ( Duabelas )' => 'XII',
        ];

        // For each absensi_siswa, get tanggal and kelas from parent absensi_mengajar
        $records = DB::table('absensi_siswa as as2')
            ->join('absensi_mengajar as am', 'as2.absensi_mengajar_id', '=', 'am.id')
            ->select('as2.id', 'am.tanggal', 'am.snapshot_kelas', 'am.jadwal_id')
            ->get();

        foreach ($records as $record) {
            $kelasName = $kelasAliases[$record->snapshot_kelas] ?? $record->snapshot_kelas;
            $kelasId = $kelasMap[$kelasName] ?? null;

            // Fallback: get from jadwal
            if (!$kelasId && $record->jadwal_id) {
                $jadwal = DB::table('jadwal')->where('id', $record->jadwal_id)->first();
                if ($jadwal)
                    $kelasId = $jadwal->kelas_id;
            }

            DB::table('absensi_siswa')
                ->where('id', $record->id)
                ->update([
                    'tanggal' => $record->tanggal,
                    'kelas_id' => $kelasId,
                ]);
        }

        // Step 4: Delete H (hadir) records — only keep S/I/A
        $deletedH = DB::table('absensi_siswa')->where('status', 'H')->delete();

        // Step 5: Delete duplicate siswa+tanggal (keep newest, which is latest mapel)
        $duplicates = DB::table('absensi_siswa')
            ->select('siswa_id', 'tanggal')
            ->selectRaw('MIN(id) as keep_id')
            ->groupBy('siswa_id', 'tanggal')
            ->havingRaw('COUNT(*) > 1')
            ->get();

        foreach ($duplicates as $dup) {
            // Keep the one with the most recent update, delete the rest
            $keepId = DB::table('absensi_siswa')
                ->where('siswa_id', $dup->siswa_id)
                ->where('tanggal', $dup->tanggal)
                ->orderByDesc('updated_at')
                ->value('id');

            DB::table('absensi_siswa')
                ->where('siswa_id', $dup->siswa_id)
                ->where('tanggal', $dup->tanggal)
                ->where('id', '!=', $keepId)
                ->delete();
        }

        // Step 6: Make new columns NOT NULL and drop old column
        Schema::table('absensi_siswa', function (Blueprint $table) {
            $table->dropColumn('absensi_mengajar_id');
        });

        // Make tanggal and kelas_id not nullable
        Schema::table('absensi_siswa', function (Blueprint $table) {
            $table->date('tanggal')->nullable(false)->change();
            $table->unsignedBigInteger('kelas_id')->nullable(false)->change();
        });

        // Step 7: Change status enum to exclude 'H'
        DB::statement("ALTER TABLE absensi_siswa MODIFY COLUMN status ENUM('S', 'I', 'A') NOT NULL");

        // Step 8: Add unique constraint
        Schema::table('absensi_siswa', function (Blueprint $table) {
            $table->unique(['siswa_id', 'tanggal']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Drop unique constraint
        Schema::table('absensi_siswa', function (Blueprint $table) {
            $table->dropUnique(['siswa_id', 'tanggal']);
        });

        // Restore status enum with 'H'
        DB::statement("ALTER TABLE absensi_siswa MODIFY COLUMN status ENUM('H', 'S', 'I', 'A') DEFAULT 'H'");

        // Add back absensi_mengajar_id
        Schema::table('absensi_siswa', function (Blueprint $table) {
            $table->foreignId('absensi_mengajar_id')->nullable()->after('id')->constrained('absensi_mengajar')->onDelete('cascade');
        });

        // Drop new columns
        Schema::table('absensi_siswa', function (Blueprint $table) {
            $table->dropForeign(['kelas_id']);
            $table->dropColumn(['tanggal', 'kelas_id']);
        });
    }
};
