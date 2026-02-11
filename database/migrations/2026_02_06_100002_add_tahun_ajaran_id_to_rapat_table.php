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
        Schema::table('rapat', function (Blueprint $table) {
            $table->foreignId('tahun_ajaran_id')->nullable()->after('id')->constrained('tahun_ajaran')->onDelete('cascade');
        });

        // Set existing rapat to tahun ajaran based on tanggal
        $rapatRecords = DB::table('rapat')->whereNull('tahun_ajaran_id')->get();
        foreach ($rapatRecords as $rapat) {
            $tanggal = $rapat->tanggal;

            // Find matching tahun ajaran by date
            $tahunAjaran = DB::table('tahun_ajaran')
                ->whereDate('tanggal_mulai', '<=', $tanggal)
                ->whereDate('tanggal_selesai', '>=', $tanggal)
                ->first();

            if ($tahunAjaran) {
                DB::table('rapat')
                    ->where('id', $rapat->id)
                    ->update(['tahun_ajaran_id' => $tahunAjaran->id]);
            } else {
                // Default to current active
                $active = DB::table('tahun_ajaran')->where('is_active', true)->first();
                if ($active) {
                    DB::table('rapat')
                        ->where('id', $rapat->id)
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
        Schema::table('rapat', function (Blueprint $table) {
            $table->dropForeign(['tahun_ajaran_id']);
            $table->dropColumn('tahun_ajaran_id');
        });
    }
};
