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
        Schema::create('absensi_mengajar', function (Blueprint $table) {
            $table->id();
            $table->foreignId('jadwal_id')->constrained('jadwal')->onDelete('cascade');
            $table->foreignId('guru_id')->constrained('guru')->onDelete('cascade');
            $table->date('tanggal');
            $table->text('ringkasan_materi')->nullable();
            $table->text('berita_acara')->nullable();
            $table->enum('status', ['hadir', 'alpha'])->default('hadir');
            $table->timestamp('absensi_time')->nullable();
            $table->timestamps();

            // Unique constraint: satu jadwal hanya bisa diabsen sekali per hari
            $table->unique(['jadwal_id', 'tanggal']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('absensi_mengajar');
    }
};
