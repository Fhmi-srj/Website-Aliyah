<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('modul_ajar', function (Blueprint $table) {
            $table->id();
            $table->foreignId('guru_id')->constrained('guru')->cascadeOnDelete();
            $table->string('mapel');
            $table->string('kelas');
            $table->string('fase')->nullable(); // E, F
            $table->tinyInteger('semester')->default(1); // 1 or 2
            $table->string('bab_materi');
            $table->string('alokasi_waktu')->nullable(); // e.g. "4 x 45 menit"
            $table->text('tujuan_pembelajaran');
            $table->json('profil_pelajar')->nullable(); // array of checked items
            $table->text('kegiatan_pendahuluan');
            $table->text('kegiatan_inti');
            $table->text('kegiatan_penutup');
            $table->text('asesmen_formatif')->nullable();
            $table->text('asesmen_sumatif')->nullable();
            $table->text('media_sumber')->nullable();
            $table->enum('status', ['draft', 'locked'])->default('draft');
            $table->timestamp('locked_at')->nullable();
            $table->unsignedBigInteger('duplicated_from')->nullable();
            $table->timestamps();

            $table->index(['guru_id', 'mapel', 'kelas']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('modul_ajar');
    }
};
