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
        Schema::create('absensi_kegiatan', function (Blueprint $table) {
            $table->id();
            $table->foreignId('kegiatan_id')->constrained('kegiatan')->onDelete('cascade');
            $table->date('tanggal');

            // Guru Penanggung Jawab
            $table->foreignId('penanggung_jawab_id')->nullable()->constrained('guru')->onDelete('set null');
            $table->enum('pj_status', ['H', 'I', 'A'])->default('A');
            $table->string('pj_keterangan')->nullable();

            // Guru Pendamping Absensi (JSON: [{guru_id, status, keterangan}])
            $table->json('absensi_pendamping')->nullable();

            // Siswa Peserta Absensi (JSON: [{siswa_id, status, keterangan}])
            $table->json('absensi_siswa')->nullable();

            // Berita Acara
            $table->text('berita_acara')->nullable();

            // Foto Kegiatan (JSON array of base64 or paths)
            $table->json('foto_kegiatan')->nullable();

            // Status absensi
            $table->enum('status', ['draft', 'submitted'])->default('submitted');

            $table->timestamps();

            // Unique constraint: one absensi per kegiatan per day
            $table->unique(['kegiatan_id', 'tanggal']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('absensi_kegiatan');
    }
};
