<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('bisyaroh_histories', function (Blueprint $table) {
            $table->bigInteger('total_jumlah')->default(0)->after('total_guru');
        });
    }

    public function down(): void
    {
        Schema::table('bisyaroh_histories', function (Blueprint $table) {
            $table->dropColumn('total_jumlah');
        });
    }
};
