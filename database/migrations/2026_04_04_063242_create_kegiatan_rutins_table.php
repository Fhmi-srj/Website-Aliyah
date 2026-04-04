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
        Schema::create('kegiatan_rutins', function (Blueprint $table) {
            $table->id();
            $table->string('nama_kegiatan');
            $table->string('jenis_kegiatan')->default('Rutin Mingguan');
            $table->string('hari'); // Senin, Selasa...
            $table->time('jam_mulai');
            $table->time('jam_selesai')->nullable();
            $table->string('tempat')->nullable();
            $table->foreignId('penanggung_jawab_id')->nullable()->constrained('guru')->nullOnDelete();
            $table->json('guru_pendamping')->nullable();
            $table->json('peserta')->nullable(); // keeping consistency with Kegiatan
            $table->json('kelas_peserta')->nullable();
            $table->text('deskripsi')->nullable();
            $table->string('status')->default('Aktif');
            $table->foreignId('tahun_ajaran_id')->nullable()->constrained('tahun_ajaran')->nullOnDelete();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('kegiatan_rutins');
    }
};
