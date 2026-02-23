<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('bisyaroh', function (Blueprint $table) {
            $table->id();
            $table->foreignId('guru_id')->constrained('guru')->onDelete('cascade');
            $table->tinyInteger('bulan'); // 1-12
            $table->smallInteger('tahun');
            $table->integer('jumlah_jam')->default(0);
            $table->integer('jumlah_hadir')->default(0);
            $table->integer('gaji_pokok')->default(0);
            $table->integer('tunj_struktural')->default(0);
            $table->integer('tunj_transport')->default(0);
            $table->integer('tunj_masa_kerja')->default(0);
            $table->integer('tunj_kegiatan')->default(0);
            $table->integer('tunj_rapat')->default(0);
            $table->integer('jumlah')->default(0);
            $table->json('potongan_detail')->nullable(); // {"arisan":20000, ...}
            $table->integer('jumlah_potongan')->default(0);
            $table->integer('total_penerimaan')->default(0);
            $table->json('detail_kegiatan')->nullable(); // [{kegiatan_id, nama, tanggal, peran, status}]
            $table->json('detail_rapat')->nullable(); // [{rapat_id, agenda, tanggal, tempat, status}]
            $table->json('detail_mengajar')->nullable(); // [{tanggal, jam, mapel, kelas, status}]
            $table->string('status')->default('draft'); // draft, final
            $table->unique(['guru_id', 'bulan', 'tahun']);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bisyaroh');
    }
};
