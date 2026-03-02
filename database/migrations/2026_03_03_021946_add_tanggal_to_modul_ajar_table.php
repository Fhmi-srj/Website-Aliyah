<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('modul_ajar', function (Blueprint $table) {
            $table->date('tanggal')->nullable()->after('bab_materi');
        });
    }

    public function down(): void
    {
        Schema::table('modul_ajar', function (Blueprint $table) {
            $table->dropColumn('tanggal');
        });
    }
};
