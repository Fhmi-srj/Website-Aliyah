<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // tagihan already had nominal/tanggal_jatuh_tempo dropped from first partial run
        // tagihan_siswa already has nominal added from first partial run
        // Now: remove old payment columns from tagihan_siswa

        if (Schema::hasColumn('tagihan_siswa', 'admin_id')) {
            Schema::table('tagihan_siswa', function (Blueprint $table) {
                $table->dropForeign(['admin_id']);
            });
        }

        $columnsToDrop = [];
        foreach (['nominal_dibayar', 'status', 'tanggal_bayar', 'catatan', 'admin_id'] as $col) {
            if (Schema::hasColumn('tagihan_siswa', $col)) {
                $columnsToDrop[] = $col;
            }
        }
        if (!empty($columnsToDrop)) {
            Schema::table('tagihan_siswa', function (Blueprint $table) use ($columnsToDrop) {
                $table->dropColumn($columnsToDrop);
            });
        }

        // Create pembayaran table if not exists
        if (!Schema::hasTable('pembayaran')) {
            Schema::create('pembayaran', function (Blueprint $table) {
                $table->id();
                $table->foreignId('tagihan_siswa_id')->constrained('tagihan_siswa')->cascadeOnDelete();
                $table->decimal('nominal', 15, 2);
                $table->date('tanggal_bayar');
                $table->text('catatan')->nullable();
                $table->foreignId('admin_id')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('pembayaran');

        if (!Schema::hasColumn('tagihan_siswa', 'nominal_dibayar')) {
            Schema::table('tagihan_siswa', function (Blueprint $table) {
                $table->decimal('nominal_dibayar', 15, 2)->default(0);
                $table->enum('status', ['belum', 'cicilan', 'lunas'])->default('belum');
                $table->date('tanggal_bayar')->nullable();
                $table->text('catatan')->nullable();
                $table->foreignId('admin_id')->nullable()->constrained('users')->nullOnDelete();
            });
        }

        if (!Schema::hasColumn('tagihan', 'nominal')) {
            Schema::table('tagihan', function (Blueprint $table) {
                $table->decimal('nominal', 15, 2)->after('nama');
                $table->date('tanggal_jatuh_tempo')->nullable();
            });
        }
    }
};
