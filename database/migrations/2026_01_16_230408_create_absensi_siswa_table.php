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
        Schema::create('absensi_siswa', function (Blueprint $table) {
            $table->id();
            $table->foreignId('absensi_mengajar_id')->constrained('absensi_mengajar')->onDelete('cascade');
            $table->foreignId('siswa_id')->constrained('siswa')->onDelete('cascade');
            $table->enum('status', ['H', 'I', 'A'])->default('H');
            $table->string('keterangan')->nullable(); // Untuk izin
            $table->timestamps();

            // Unique constraint: satu siswa hanya bisa diabsen sekali per sesi
            $table->unique(['absensi_mengajar_id', 'siswa_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('absensi_siswa');
    }
};
