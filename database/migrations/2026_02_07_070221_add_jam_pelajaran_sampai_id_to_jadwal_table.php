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
        Schema::table('jadwal', function (Blueprint $table) {
            $table->unsignedBigInteger('jam_pelajaran_sampai_id')->nullable()->after('jam_pelajaran_id');
            $table->foreign('jam_pelajaran_sampai_id')->references('id')->on('jam_pelajaran')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('jadwal', function (Blueprint $table) {
            $table->dropForeign(['jam_pelajaran_sampai_id']);
            $table->dropColumn('jam_pelajaran_sampai_id');
        });
    }
};
