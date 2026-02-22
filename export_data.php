<?php
require_once __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

$sql = "-- ============================================\n";
$sql .= "-- Import Pemasukan & Pengeluaran Data (v3)\n";
$sql .= "-- Generated: " . date('Y-m-d H:i:s') . "\n";
$sql .= "-- ============================================\n\n";

$sql .= "-- === TRANSAKSI KATEGORI ===\n";
foreach (DB::table('transaksi_kategori')->get() as $cat) {
    $nama = addslashes($cat->nama);
    $tipe = addslashes($cat->tipe);
    $sql .= "INSERT INTO `transaksi_kategori` (`id`, `nama`, `tipe`, `created_at`, `updated_at`) VALUES ({$cat->id}, '{$nama}', '{$tipe}', NOW(), NOW()) ON DUPLICATE KEY UPDATE `nama` = '{$nama}', `tipe` = '{$tipe}';\n";
}

$sql .= "\nTRUNCATE TABLE `pemasukan`;\nTRUNCATE TABLE `pengeluaran`;\n";

$sql .= "\n-- === PENGELUARAN ===\n";
$pCount = 0;
foreach (DB::table('pengeluaran')->get() as $p) {
    $sql .= "INSERT INTO `pengeluaran` (`admin_id`, `sumber_id`, `nominal`, `kategori_id`, `keterangan`, `tanggal`, `tahun_ajaran_id`, `created_at`, `updated_at`) VALUES ({$p->admin_id}, {$p->sumber_id}, {$p->nominal}, {$p->kategori_id}, '" . addslashes($p->keterangan ?? '') . "', '{$p->tanggal}', {$p->tahun_ajaran_id}, NOW(), NOW());\n";
    $pCount++;
}

$sql .= "\n-- === PEMASUKAN ===\n";
$mCount = 0;
foreach (DB::table('pemasukan')->get() as $p) {
    $sql .= "INSERT INTO `pemasukan` (`admin_id`, `sumber_id`, `nominal`, `keterangan`, `tanggal`, `tahun_ajaran_id`, `created_at`, `updated_at`) VALUES ({$p->admin_id}, {$p->sumber_id}, {$p->nominal}, '" . addslashes($p->keterangan ?? '') . "', '{$p->tanggal}', {$p->tahun_ajaran_id}, NOW(), NOW());\n";
    $mCount++;
}

file_put_contents(__DIR__ . '/import_data.sql', $sql);
echo "Pengeluaran: $pCount | Pemasukan: $mCount\n";
