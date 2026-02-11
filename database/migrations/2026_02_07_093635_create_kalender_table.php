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
        Schema::create('kalender', function (Blueprint $table) {
            $table->id();
            $table->date('tanggal_mulai');
            $table->date('tanggal_berakhir')->nullable();
            $table->string('kegiatan');
            $table->enum('status_kbm', ['Aktif', 'Libur'])->default('Aktif');
            $table->string('penanggung_jawab')->nullable();
            $table->enum('keterangan', ['Kegiatan', 'Libur'])->default('Kegiatan');
            $table->decimal('rab', 15, 2)->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('kalender');
    }
};
