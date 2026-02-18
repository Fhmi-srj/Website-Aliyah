<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('transaksi_kategori', function (Blueprint $table) {
            $table->id();
            $table->string('nama');
            $table->enum('tipe', ['sumber_pemasukan', 'sumber_pengeluaran', 'kategori_pengeluaran']);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['nama', 'tipe']); // prevent duplicate names per type
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transaksi_kategori');
    }
};
