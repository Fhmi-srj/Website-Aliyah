<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('nilai_siswa', function (Blueprint $table) {
            $table->id();
            $table->foreignId('absensi_mengajar_id')->constrained('absensi_mengajar')->onDelete('cascade');
            $table->foreignId('siswa_id')->constrained('siswa')->onDelete('cascade');
            $table->decimal('nilai', 5, 2)->nullable();
            $table->text('keterangan')->nullable();
            $table->timestamps();

            $table->unique(['absensi_mengajar_id', 'siswa_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('nilai_siswa');
    }
};
