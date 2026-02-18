<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('supervisi', function (Blueprint $table) {
            $table->id();
            $table->foreignId('supervisor_id')->constrained('guru')->onDelete('cascade');
            $table->foreignId('guru_id')->constrained('guru')->onDelete('cascade');
            $table->foreignId('mapel_id')->constrained('mapel')->onDelete('cascade');
            $table->date('tanggal');
            $table->text('catatan')->nullable();
            $table->json('hasil_supervisi')->nullable();
            $table->enum('status', ['dijadwalkan', 'selesai'])->default('dijadwalkan');
            $table->foreignId('tahun_ajaran_id')->nullable()->constrained('tahun_ajaran')->onDelete('set null');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('supervisi');
    }
};
