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
        Schema::table('kalender', function (Blueprint $table) {
            // Add guru_id column for penanggung jawab relationship
            $table->unsignedBigInteger('guru_id')->nullable()->after('status_kbm');
            $table->foreign('guru_id')->references('id')->on('guru')->onDelete('set null');

            // Drop old penanggung_jawab string column
            $table->dropColumn('penanggung_jawab');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('kalender', function (Blueprint $table) {
            $table->dropForeign(['guru_id']);
            $table->dropColumn('guru_id');
            $table->string('penanggung_jawab')->nullable()->after('status_kbm');
        });
    }
};
