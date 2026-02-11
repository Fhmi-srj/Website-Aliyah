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
        Schema::table('jadwal', function (Blueprint $table) {
            // Add tahun_ajaran_id foreign key
            $table->foreignId('tahun_ajaran_id')->nullable()->after('id')->constrained('tahun_ajaran')->onDelete('cascade');
        });

        // Migrate existing data: convert tahun_ajaran string to tahun_ajaran_id
        $jadwalRecords = DB::table('jadwal')->whereNull('tahun_ajaran_id')->get();
        foreach ($jadwalRecords as $jadwal) {
            $tahunAjaran = DB::table('tahun_ajaran')
                ->where('nama', $jadwal->tahun_ajaran)
                ->first();

            if ($tahunAjaran) {
                DB::table('jadwal')
                    ->where('id', $jadwal->id)
                    ->update(['tahun_ajaran_id' => $tahunAjaran->id]);
            } else {
                // Default to current active tahun ajaran
                $active = DB::table('tahun_ajaran')->where('is_active', true)->first();
                if ($active) {
                    DB::table('jadwal')
                        ->where('id', $jadwal->id)
                        ->update(['tahun_ajaran_id' => $active->id]);
                }
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('jadwal', function (Blueprint $table) {
            $table->dropForeign(['tahun_ajaran_id']);
            $table->dropColumn('tahun_ajaran_id');
        });
    }
};
