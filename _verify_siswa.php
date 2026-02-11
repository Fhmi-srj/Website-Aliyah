<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;

echo "=== VERIFIKASI ABSENSI SISWA ===\n\n";

// 1. Counts
$total = DB::table('absensi_siswa')->count();
$byStatus = DB::table('absensi_siswa')
    ->selectRaw("status, count(*) as cnt")
    ->groupBy('status')
    ->pluck('cnt', 'status')
    ->toArray();

echo "Total records: {$total}\n";
foreach ($byStatus as $s => $c) {
    echo "  Status {$s}: {$c}\n";
}

// 2. Check all absensi_mengajar_id are valid
$invalidParent = DB::table('absensi_siswa as as2')
    ->leftJoin('absensi_mengajar as am', 'as2.absensi_mengajar_id', '=', 'am.id')
    ->whereNull('am.id')
    ->count();
echo "\nInvalid absensi_mengajar_id: {$invalidParent}\n";

// 3. Check all siswa_id are valid
$invalidSiswa = DB::table('absensi_siswa as as2')
    ->leftJoin('siswa as s', 'as2.siswa_id', '=', 's.id')
    ->whereNull('s.id')
    ->count();
echo "Invalid siswa_id: {$invalidSiswa}\n";

// 4. Expected count: 445 absensi_mengajar x students per kelas
$amRecords = DB::table('absensi_mengajar')
    ->select('id', 'snapshot_kelas')
    ->get();

$kelasMap = ['X ( Sepuluh )' => 43, 'XI ( Sebelas )' => 44, 'XII ( Duabelas )' => 45, 'X' => 43, 'XI' => 44, 'XII' => 45];
$siswaPerKelas = DB::table('siswa')->selectRaw('kelas_id, count(*) as cnt')->groupBy('kelas_id')->pluck('cnt', 'kelas_id')->toArray();

$expectedTotal = 0;
foreach ($amRecords as $am) {
    $kelasId = $kelasMap[$am->snapshot_kelas] ?? null;
    if ($kelasId && isset($siswaPerKelas[$kelasId])) {
        $expectedTotal += $siswaPerKelas[$kelasId];
    }
}
echo "\nExpected total: {$expectedTotal}\n";
echo "Actual total: {$total}\n";
echo "Match: " . ($expectedTotal === $total ? 'YES ✅' : 'NO ❌ (diff: ' . ($total - $expectedTotal) . ')') . "\n";

// 5. Check duplicates
$dupCount = DB::table('absensi_siswa')
    ->selectRaw('absensi_mengajar_id, siswa_id, count(*) as cnt')
    ->groupBy('absensi_mengajar_id', 'siswa_id')
    ->havingRaw('count(*) > 1')
    ->count();
echo "\nDuplicate (same mengajar+siswa): {$dupCount}\n";

// 6. Spot check: pick 5 absent students and verify against Excel data
echo "\n=== 5 RANDOM ABSENT RECORDS ===\n";
$absents = DB::table('absensi_siswa as as2')
    ->join('siswa as s', 'as2.siswa_id', '=', 's.id')
    ->join('absensi_mengajar as am', 'as2.absensi_mengajar_id', '=', 'am.id')
    ->whereIn('as2.status', ['S', 'I', 'A'])
    ->select('s.nama', 'am.tanggal', 'am.snapshot_mapel', 'am.snapshot_kelas', 'as2.status', 'as2.keterangan')
    ->inRandomOrder()
    ->take(5)
    ->get();

foreach ($absents as $a) {
    echo "  {$a->nama} | {$a->tanggal} | {$a->snapshot_mapel} | {$a->snapshot_kelas} | {$a->status} | {$a->keterangan}\n";
}
