<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('pengeluaran', function (Blueprint $table) {
            $table->id();
            $table->foreignId('admin_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('sumber_id')->constrained('transaksi_kategori')->cascadeOnDelete();
            $table->decimal('nominal', 15, 2);
            $table->foreignId('kategori_id')->constrained('transaksi_kategori')->cascadeOnDelete();
            $table->text('keterangan')->nullable();
            $table->date('tanggal');
            $table->foreignId('tahun_ajaran_id')->constrained('tahun_ajaran')->cascadeOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pengeluaran');
    }
};
