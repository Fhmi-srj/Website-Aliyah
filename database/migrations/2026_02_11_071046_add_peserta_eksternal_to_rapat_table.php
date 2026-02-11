<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('rapat', function (Blueprint $table) {
            $table->json('peserta_eksternal')->nullable()->after('peserta_rapat');
        });
    }

    public function down(): void
    {
        Schema::table('rapat', function (Blueprint $table) {
            $table->dropColumn('peserta_eksternal');
        });
    }
};
