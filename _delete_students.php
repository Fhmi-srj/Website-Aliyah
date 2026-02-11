<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

$names = ['MUHAMMAD LUTFI AKMAL', 'SALSABILA SUFIANI', 'WULAN FITRI NAZNINNAIRA ISMANTO'];
$ids = DB::table('siswa')->whereIn('nama', $names)->pluck('id');
echo "Student IDs to delete: " . implode(', ', $ids->toArray()) . PHP_EOL;

$delAbsensi = DB::table('absensi_siswa')->whereIn('siswa_id', $ids)->delete();
echo "Deleted {$delAbsensi} absensi_siswa records" . PHP_EOL;

$delSiswa = DB::table('siswa')->whereIn('id', $ids)->delete();
echo "Deleted {$delSiswa} siswa records" . PHP_EOL;

echo PHP_EOL . "Remaining: " . DB::table('siswa')->count() . " siswa, " . DB::table('absensi_siswa')->count() . " absensi_siswa" . PHP_EOL;
