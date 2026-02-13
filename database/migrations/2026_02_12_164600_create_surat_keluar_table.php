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
        Schema::create('surat_keluar', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->string('kode_surat', 3); // 001-005
            $table->string('jenis_surat', 3); // 001-006
            $table->integer('nomor_urut');
            $table->string('nomor_surat', 50); // e.g. 02/004/006/VIII/2024
            $table->date('tanggal');
            $table->text('keterangan')->nullable();
            $table->string('file_surat')->nullable(); // uploaded file path
            $table->foreignId('tahun_ajaran_id')->nullable()->constrained('tahun_ajaran')->nullOnDelete();
            $table->timestamps();

            $table->index(['kode_surat', 'jenis_surat', 'tanggal']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('surat_keluar');
    }
};
