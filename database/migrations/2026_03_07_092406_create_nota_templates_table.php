<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('nota_templates', function (Blueprint $table) {
            $table->id();
            $table->string('nama');
            $table->json('fields')->nullable();
            $table->longText('layout_html')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('nota_history', function (Blueprint $table) {
            $table->id();
            $table->foreignId('nota_template_id')->constrained('nota_templates')->onDelete('cascade');
            $table->json('data')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('nota_history');
        Schema::dropIfExists('nota_templates');
    }
};
