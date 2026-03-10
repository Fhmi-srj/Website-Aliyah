<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('absensi_mengajar', function (Blueprint $table) {
            $table->json('foto_mengajar')->nullable()->after('berita_acara');
        });
    }

    public function down(): void
    {
        Schema::table('absensi_mengajar', function (Blueprint $table) {
            $table->dropColumn('foto_mengajar');
        });
    }
};
