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
        Schema::table('rapat', function (Blueprint $table) {
            // Add pimpinan_id as FK (will migrate data from pimpinan string later)
            $table->unsignedBigInteger('pimpinan_id')->nullable()->after('jenis_rapat');
            // Add sekretaris_id as FK (will migrate data from sekretaris string later)
            $table->unsignedBigInteger('sekretaris_id')->nullable()->after('pimpinan_id');
            // Add peserta_rapat JSON array of guru IDs
            $table->json('peserta_rapat')->nullable()->after('sekretaris_id');

            $table->foreign('pimpinan_id')->references('id')->on('guru')->onDelete('set null');
            $table->foreign('sekretaris_id')->references('id')->on('guru')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('rapat', function (Blueprint $table) {
            $table->dropForeign(['pimpinan_id']);
            $table->dropForeign(['sekretaris_id']);
            $table->dropColumn(['pimpinan_id', 'sekretaris_id', 'peserta_rapat']);
        });
    }
};
