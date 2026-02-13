<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        // Convert any existing 'Libur' or 'Ujian/Tes' records to 'Keterangan'
        DB::table('kalender')->where('keterangan', 'Libur')->update(['keterangan' => 'Keterangan']);

        // Update enum to only allow 'Kegiatan' and 'Keterangan'
        DB::statement("ALTER TABLE kalender MODIFY COLUMN keterangan ENUM('Kegiatan', 'Keterangan') DEFAULT 'Kegiatan'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE kalender MODIFY COLUMN keterangan ENUM('Kegiatan', 'Libur', 'Keterangan') DEFAULT 'Kegiatan'");
    }
};
