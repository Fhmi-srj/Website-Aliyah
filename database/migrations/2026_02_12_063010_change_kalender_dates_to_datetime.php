<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::statement("ALTER TABLE kalender MODIFY COLUMN tanggal_mulai DATETIME NULL");
        DB::statement("ALTER TABLE kalender MODIFY COLUMN tanggal_berakhir DATETIME NULL");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("ALTER TABLE kalender MODIFY COLUMN tanggal_mulai DATE NULL");
        DB::statement("ALTER TABLE kalender MODIFY COLUMN tanggal_berakhir DATE NULL");
    }
};
