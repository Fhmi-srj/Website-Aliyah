<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('supervisi_questions', function (Blueprint $table) {
            $table->id();
            $table->enum('bagian', ['a', 'b'])->comment('Bagian A = Perencanaan, B = Pelaksanaan');
            $table->string('key', 10)->unique()->comment('e.g. a1, b3');
            $table->string('label', 255);
            $table->text('description')->nullable();
            $table->integer('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Seed default questions from existing hardcoded data
        $questions = [
            // Bagian A: Perencanaan Pembelajaran
            ['bagian' => 'a', 'key' => 'a1', 'label' => 'Kelengkapan Komponen Minimum', 'description' => 'Modul ajar memuat Tujuan Pembelajaran, Langkah Pembelajaran, Rencana Asesmen, dan Media Pembelajaran.', 'sort_order' => 1],
            ['bagian' => 'a', 'key' => 'a2', 'label' => 'Kesesuaian dengan Karakteristik Siswa', 'description' => 'Modul ajar dirancang sesuai kesiapan belajar, minat, dan tingkat penguasaan peserta didik.', 'sort_order' => 2],
            ['bagian' => 'a', 'key' => 'a3', 'label' => 'Kualitas Penyajian Materi', 'description' => 'Modul ajar disusun secara fleksibel, jelas, sederhana, esensial, menarik, dan kontekstual.', 'sort_order' => 3],
            ['bagian' => 'a', 'key' => 'a4', 'label' => 'Instrumen Asesmen Terukur', 'description' => 'Terdapat instrumen dan rubrik penilaian yang jelas untuk mengukur ketercapaian tujuan pembelajaran.', 'sort_order' => 4],
            // Bagian B: Pelaksanaan Pembelajaran
            ['bagian' => 'b', 'key' => 'b1', 'label' => 'Pembelajaran Berdiferensiasi', 'description' => 'Pelaksanaan mengakomodasi kebutuhan belajar siswa serta memberikan scaffolding atau tantangan yang tepat.', 'sort_order' => 1],
            ['bagian' => 'b', 'key' => 'b2', 'label' => 'Keterlibatan & Interaksi Aktif', 'description' => 'Pendidik aktif mendengarkan, memberikan pertanyaan terbuka, serta melibatkan siswa dalam kolaborasi.', 'sort_order' => 2],
            ['bagian' => 'b', 'key' => 'b3', 'label' => 'Pemberian Umpan Balik', 'description' => 'Terdapat umpan balik konstruktif dari guru ke siswa, serta kesempatan refleksi diri dan umpan balik antar-teman.', 'sort_order' => 3],
            ['bagian' => 'b', 'key' => 'b4', 'label' => 'Pengembangan Karakter', 'description' => 'Pendidik menjadi teladan, membangun kesepakatan kelas, dan mengintegrasikan nilai-nilai Profil Pelajar Pancasila.', 'sort_order' => 4],
            ['bagian' => 'b', 'key' => 'b5', 'label' => 'Lingkungan Belajar Aman & Bahagia', 'description' => 'Proses belajar menumbuhkan rasa bahagia, aman, dan nyaman bagi peserta didik secara holistik.', 'sort_order' => 5],
        ];

        $now = now();
        foreach ($questions as &$q) {
            $q['is_active'] = true;
            $q['created_at'] = $now;
            $q['updated_at'] = $now;
        }

        DB::table('supervisi_questions')->insert($questions);
    }

    public function down(): void
    {
        Schema::dropIfExists('supervisi_questions');
    }
};
