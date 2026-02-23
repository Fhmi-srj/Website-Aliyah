<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('bisyaroh_histories', function (Blueprint $table) {
            $table->id();
            $table->tinyInteger('bulan'); // 1-12
            $table->smallInteger('tahun');
            $table->string('label')->nullable(); // "Bisyaroh Februari 2026"
            $table->longText('data'); // JSON snapshot of all bisyaroh data
            $table->integer('total_guru')->default(0);
            $table->bigInteger('total_penerimaan')->default(0);
            $table->string('status')->default('draft'); // draft, locked
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
            $table->foreignId('locked_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('locked_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bisyaroh_histories');
    }
};
