<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();
use Illuminate\Support\Facades\DB;

echo "=== absensi_siswa ===\n";
$cols = DB::getSchemaBuilder()->getColumnListing('absensi_siswa');
echo "Columns: " . implode(', ', $cols) . "\n";
$sample = DB::table('absensi_siswa')->first();
echo "Sample: " . json_encode((array) $sample) . "\n";

echo "\n=== absensi_rapat ===\n";
$cols = DB::getSchemaBuilder()->getColumnListing('absensi_rapat');
echo "Columns: " . implode(', ', $cols) . "\n";
$sample = DB::table('absensi_rapat')->first();
echo "Sample: " . json_encode((array) $sample) . "\n";

echo "\n=== absensi_mengajar ===\n";
$cols = DB::getSchemaBuilder()->getColumnListing('absensi_mengajar');
echo "Columns: " . implode(', ', $cols) . "\n";
$sample = DB::table('absensi_mengajar')->first();
echo "Sample: " . json_encode((array) $sample) . "\n";
