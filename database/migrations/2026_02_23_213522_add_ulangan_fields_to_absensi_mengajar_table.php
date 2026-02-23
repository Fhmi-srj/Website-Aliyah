<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('absensi_mengajar', function (Blueprint $table) {
            $table->enum('jenis_kegiatan', ['mengajar', 'ulangan'])->default('mengajar')->after('status');
            $table->enum('jenis_ulangan', ['ulangan_harian', 'uts', 'uas', 'quiz'])->nullable()->after('jenis_kegiatan');
        });
    }

    public function down(): void
    {
        Schema::table('absensi_mengajar', function (Blueprint $table) {
            $table->dropColumn(['jenis_kegiatan', 'jenis_ulangan']);
        });
    }
};
