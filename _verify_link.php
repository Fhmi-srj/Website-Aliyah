<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;

echo "=== VERIFIKASI LINKING JADWAL ===\n\n";

// 1. Count total
$total = DB::table('absensi_mengajar')->whereNotNull('jadwal_id')->count();
$unlinked = DB::table('absensi_mengajar')->whereNull('jadwal_id')->count();
echo "Total linked: {$total}\n";
echo "Total unlinked: {$unlinked}\n\n";

// 2. Check hari mismatch
$hariMismatch = DB::table('absensi_mengajar as a')
    ->join('jadwal as j', 'a.jadwal_id', '=', 'j.id')
    ->whereNotNull('a.jadwal_id')
    ->whereColumn('a.snapshot_hari', '!=', 'j.hari')
    ->count();
echo "Hari mismatch: {$hariMismatch}\n";

// 3. Check kelas mismatch
$kelasRecords = DB::table('absensi_mengajar as a')
    ->join('jadwal as j', 'a.jadwal_id', '=', 'j.id')
    ->join('kelas as k', 'j.kelas_id', '=', 'k.id')
    ->whereNotNull('a.jadwal_id')
    ->select('a.snapshot_kelas', 'k.nama_kelas')
    ->get();

$kelasMismatch = 0;
foreach ($kelasRecords as $r) {
    if (!str_starts_with($r->snapshot_kelas, $r->nama_kelas)) {
        $kelasMismatch++;
    }
}
echo "Kelas mismatch: {$kelasMismatch}\n";

// 4. Check mapel - show mapping
$mapelCheck = DB::table('absensi_mengajar as a')
    ->join('jadwal as j', 'a.jadwal_id', '=', 'j.id')
    ->join('mapel as m', 'j.mapel_id', '=', 'm.id')
    ->whereNotNull('a.jadwal_id')
    ->select('a.snapshot_mapel', 'm.nama_mapel')
    ->distinct()
    ->get();

echo "\n=== MAPEL MAPPING (snapshot -> jadwal) ===\n";
$mapelMismatch = 0;
foreach ($mapelCheck as $r) {
    $match = ($r->snapshot_mapel === $r->nama_mapel) ? 'EXACT' : 'ALIAS';
    echo "  {$r->snapshot_mapel} -> {$r->nama_mapel} [{$match}]\n";
}

// 5. Random samples
echo "\n=== 10 RANDOM SAMPLES ===\n";
$samples = DB::table('absensi_mengajar as a')
    ->join('jadwal as j', 'a.jadwal_id', '=', 'j.id')
    ->join('kelas as k', 'j.kelas_id', '=', 'k.id')
    ->join('mapel as m', 'j.mapel_id', '=', 'm.id')
    ->join('guru as g', 'j.guru_id', '=', 'g.id')
    ->whereNotNull('a.jadwal_id')
    ->select(
        'a.id',
        'a.tanggal',
        'a.snapshot_hari',
        'j.hari as j_hari',
        'a.snapshot_kelas',
        'k.nama_kelas as j_kelas',
        'a.snapshot_mapel',
        'm.nama_mapel as j_mapel',
        'a.snapshot_guru_nama',
        'g.nama as j_guru'
    )
    ->inRandomOrder()
    ->take(10)
    ->get();

foreach ($samples as $s) {
    $hOk = $s->snapshot_hari === $s->j_hari ? 'OK' : 'XX';
    $kOk = str_starts_with($s->snapshot_kelas, $s->j_kelas) ? 'OK' : 'XX';
    echo "  #{$s->id} {$s->tanggal} hari[{$hOk}] kelas[{$kOk}] | {$s->snapshot_mapel}->{$s->j_mapel} | {$s->snapshot_guru_nama}\n";
}

// 6. Hari mismatch details if any
if ($hariMismatch > 0) {
    echo "\n=== HARI MISMATCH DETAILS ===\n";
    $mismatches = DB::table('absensi_mengajar as a')
        ->join('jadwal as j', 'a.jadwal_id', '=', 'j.id')
        ->whereColumn('a.snapshot_hari', '!=', 'j.hari')
        ->select('a.id', 'a.tanggal', 'a.snapshot_hari', 'j.hari as j_hari', 'a.snapshot_guru_nama', 'a.snapshot_mapel')
        ->take(20)
        ->get();
    foreach ($mismatches as $m) {
        echo "  #{$m->id} {$m->tanggal} snap:{$m->snapshot_hari} jadwal:{$m->j_hari} | {$m->snapshot_guru_nama} {$m->snapshot_mapel}\n";
    }
}
