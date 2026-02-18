<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('roles', function (Blueprint $table) {
            $table->json('allowed_pages')->nullable()->after('level');
        });

        // Set default allowed_pages for existing roles
        $defaults = [
            'superadmin' => json_encode('*'),
            'kepala_madrasah' => json_encode('*'),
            'waka_kurikulum' => json_encode([
                '/dashboard',
                '/data-induk/jadwal',
                '/data-induk/jam-pelajaran',
                '/data-induk/mapel',
                '/data-induk/kelas',
                '/data-induk/kalender',
                '/data-induk/absensi-siswa',
                '/data-induk/ekskul',
                '/data-induk/rapat',
                '/data-induk/surat',
                '/profil',
            ]),
            'waka_kesiswaan' => json_encode([
                '/dashboard',
                '/data-induk/siswa',
                '/data-induk/alumni',
                '/data-induk/ekskul',
                '/data-induk/kegiatan',
                '/data-induk/absensi-siswa',
                '/data-induk/kalender',
                '/profil',
            ]),
            'wali_kelas' => json_encode([
                '/dashboard',
                '/data-induk/absensi-siswa',
                '/profil',
            ]),
            'tata_usaha' => json_encode([
                '/dashboard',
                '/data-induk/siswa',
                '/data-induk/alumni',
                '/data-induk/ekskul',
                '/data-induk/kegiatan',
                '/data-induk/absensi-siswa',
                '/data-induk/kalender',
                '/data-induk/surat',
                '/transaksi',
                '/profil',
            ]),
        ];

        foreach ($defaults as $roleName => $pages) {
            DB::table('roles')
                ->where('name', $roleName)
                ->update(['allowed_pages' => $pages]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('roles', function (Blueprint $table) {
            $table->dropColumn('allowed_pages');
        });
    }
};
