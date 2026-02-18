<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('tagihan_siswa', function (Blueprint $table) {
            $table->id();
            $table->foreignId('siswa_id')->constrained('siswa')->cascadeOnDelete();
            $table->foreignId('kelas_id')->constrained('kelas')->cascadeOnDelete();
            $table->foreignId('tagihan_id')->constrained('tagihan')->cascadeOnDelete();
            $table->decimal('nominal_dibayar', 15, 2)->default(0);
            $table->enum('status', ['belum', 'cicilan', 'lunas'])->default('belum');
            $table->date('tanggal_bayar')->nullable();
            $table->text('catatan')->nullable();
            $table->foreignId('admin_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['siswa_id', 'tagihan_id']); // prevent duplicate
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tagihan_siswa');
    }
};
