<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('absensi_mengajar', function (Blueprint $table) {
            $table->enum('guru_status', ['H', 'I'])->default('H')->after('status');
            $table->text('guru_keterangan')->nullable()->after('guru_status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('absensi_mengajar', function (Blueprint $table) {
            $table->dropColumn(['guru_status', 'guru_keterangan']);
        });
    }
};
