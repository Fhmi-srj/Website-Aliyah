<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('attendance_tokens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('guru_id')->constrained('guru')->onDelete('cascade');
            $table->string('token', 64)->unique();
            $table->enum('type', ['mengajar', 'kegiatan', 'rapat']);
            $table->unsignedBigInteger('reference_id'); // jadwal_id / kegiatan_id / rapat_id
            $table->date('tanggal');
            $table->timestamp('expires_at');
            $table->timestamp('used_at')->nullable();
            $table->timestamps();

            $table->index(['token']);
            $table->index(['guru_id', 'type', 'reference_id', 'tanggal']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendance_tokens');
    }
};
