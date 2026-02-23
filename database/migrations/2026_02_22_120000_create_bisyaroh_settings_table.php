<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('bisyaroh_settings', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->string('value')->default('0');
            $table->string('type')->default('integer'); // integer, string, boolean
            $table->string('category'); // tarif_dasar, tunjangan_jabatan, tunjangan_kegiatan, potongan
            $table->string('label');
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bisyaroh_settings');
    }
};
