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
        Schema::table('pemasukan', function (Blueprint $table) {
            $table->string('foto')->nullable()->after('tanggal');
        });

        Schema::table('pengeluaran', function (Blueprint $table) {
            $table->string('foto')->nullable()->after('tanggal');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('pemasukan', function (Blueprint $table) {
            $table->dropColumn('foto');
        });

        Schema::table('pengeluaran', function (Blueprint $table) {
            $table->dropColumn('foto');
        });
    }
};
