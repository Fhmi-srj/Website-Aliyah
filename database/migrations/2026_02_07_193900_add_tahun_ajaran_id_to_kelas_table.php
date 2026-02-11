<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use App\Models\TahunAjaran;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('kelas', function (Blueprint $table) {
            $table->foreignId('tahun_ajaran_id')->nullable()->after('status')->constrained('tahun_ajaran')->nullOnDelete();
        });

        // Set existing data to current tahun ajaran
        $current = TahunAjaran::getCurrent();
        if ($current) {
            \DB::table('kelas')->whereNull('tahun_ajaran_id')->update(['tahun_ajaran_id' => $current->id]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('kelas', function (Blueprint $table) {
            $table->dropForeign(['tahun_ajaran_id']);
            $table->dropColumn('tahun_ajaran_id');
        });
    }
};
