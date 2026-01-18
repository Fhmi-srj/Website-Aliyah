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
        Schema::create('absensi_rapat', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('rapat_id');
            $table->date('tanggal');

            // Pimpinan attendance (can self-attend)
            $table->enum('pimpinan_status', ['H', 'I', 'A'])->default('A');
            $table->string('pimpinan_keterangan')->nullable();
            $table->boolean('pimpinan_self_attended')->default(false);
            $table->timestamp('pimpinan_attended_at')->nullable();

            // Sekretaris attendance
            $table->enum('sekretaris_status', ['H', 'I', 'A'])->default('A');
            $table->string('sekretaris_keterangan')->nullable();

            // Peserta/Guru attendance as JSON array
            // Format: [{guru_id, status, keterangan, self_attended, attended_at}]
            $table->json('absensi_peserta')->nullable();

            // Meeting notes (required by sekretaris)
            $table->text('notulensi')->nullable();

            // Meeting photos (2-4 photos, base64 compressed)
            $table->json('foto_rapat')->nullable();

            // Record status
            $table->enum('status', ['draft', 'submitted'])->default('draft');

            $table->timestamps();

            $table->foreign('rapat_id')->references('id')->on('rapat')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('absensi_rapat');
    }
};
