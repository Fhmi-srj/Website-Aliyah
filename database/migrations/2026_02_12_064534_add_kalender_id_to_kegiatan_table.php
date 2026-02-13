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
            $table->unsignedBigInteger('kalender_id')->nullable()->after('tahun_ajaran_id');
            $table->foreign('kalender_id')->references('id')->on('kalender')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('kegiatan', function (Blueprint $table) {
            $table->dropForeign(['kalender_id']);
            $table->dropColumn('kalender_id');
        });
    }
};
