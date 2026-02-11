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
        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('action'); // 'create', 'update', 'delete', 'restore', 'attendance'
            $table->string('model_type'); // 'Guru', 'Siswa', 'Kegiatan', etc.
            $table->unsignedBigInteger('model_id')->nullable();
            $table->string('description'); // Human-readable description
            $table->json('old_values')->nullable(); // For update/delete - restore capability
            $table->json('new_values')->nullable(); // For create/update
            $table->string('ip_address')->nullable();
            $table->string('user_agent')->nullable();
            $table->timestamps();

            $table->index(['model_type', 'model_id']);
            $table->index('action');
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('activity_logs');
    }
};
