<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('guru_jabatan', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('guru_id');
            $table->unsignedBigInteger('bisyaroh_setting_id');
            $table->timestamps();

            $table->unique(['guru_id', 'bisyaroh_setting_id']);
            $table->foreign('guru_id')->references('id')->on('guru')->onDelete('cascade');
            $table->foreign('bisyaroh_setting_id')->references('id')->on('bisyaroh_settings')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('guru_jabatan');
    }
};
