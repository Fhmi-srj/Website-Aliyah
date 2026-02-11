<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('document_verifications', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('jenis_dokumen'); // "Laporan Kegiatan" / "Berita Acara Rapat"
            $table->string('perihal'); // nama kegiatan/rapat
            $table->string('dikeluarkan_oleh'); // nama Kepala Madrasah
            $table->string('nip_pejabat')->nullable();
            $table->date('tanggal_dokumen')->nullable();
            $table->date('tanggal_cetak');
            $table->json('detail')->nullable(); // extra info
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('document_verifications');
    }
};
