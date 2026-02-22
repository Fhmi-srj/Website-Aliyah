<?php
// Smart export v3: correct column names, error handling
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();
use Illuminate\Support\Facades\DB;

function v($x)
{
    return is_null($x) ? 'NULL' : "'" . addslashes($x) . "'";
}

$sql = "-- Smart Import v3\n-- Generated: " . date('Y-m-d H:i:s') . "\nSET FOREIGN_KEY_CHECKS=0;\n\n";

// Build lookup maps
$guruMap = []; // id => nip
foreach (DB::table('guru')->get(['id', 'nip']) as $g)
    $guruMap[$g->id] = $g->nip;

$kelasMap = []; // id => nama_kelas
foreach (DB::table('kelas')->get(['id', 'nama_kelas']) as $k)
    $kelasMap[$k->id] = $k->nama_kelas;

$mapelMap = []; // id => nama_mapel
foreach (DB::table('mapel')->get(['id', 'nama_mapel']) as $m)
    $mapelMap[$m->id] = $m->nama_mapel;

$taMap = []; // id => nama
foreach (DB::table('tahun_ajaran')->get(['id', 'nama']) as $t)
    $taMap[$t->id] = $t->nama;

$siswaMap = []; // id => nisn
foreach (DB::table('siswa')->get(['id', 'nisn', 'nis']) as $s)
    $siswaMap[$s->id] = $s->nisn ?: $s->nis;

echo "Maps: " . count($guruMap) . " guru, " . count($kelasMap) . " kelas, " . count($mapelMap) . " mapel, " . count($taMap) . " TA, " . count($siswaMap) . " siswa\n\n";

// Jadwal map: id => {guru_nip, kelas, mapel, ta, hari}
$jadwalMap = [];
foreach (DB::table('jadwal')->get() as $j) {
    $jadwalMap[$j->id] = [
        'nip' => $guruMap[$j->guru_id] ?? null,
        'kelas' => $kelasMap[$j->kelas_id] ?? null,
        'mapel' => $mapelMap[$j->mapel_id] ?? null,
        'ta' => $taMap[$j->tahun_ajaran_id] ?? null,
        'hari' => $j->hari,
    ];
}

// Helper: guru subquery
function guruQ($nip)
{
    return "(SELECT id FROM guru WHERE nip=" . v($nip) . " LIMIT 1)";
}
// Helper: jadwal subquery
function jadwalQ($j)
{
    return "(SELECT j.id FROM jadwal j JOIN guru g ON g.id=j.guru_id JOIN tahun_ajaran ta ON ta.id=j.tahun_ajaran_id JOIN kelas k ON k.id=j.kelas_id JOIN mapel m ON m.id=j.mapel_id WHERE g.nip=" . v($j['nip']) . " AND ta.nama=" . v($j['ta']) . " AND k.nama_kelas=" . v($j['kelas']) . " AND m.nama_mapel=" . v($j['mapel']) . " AND j.hari=" . v($j['hari']) . " LIMIT 1)";
}
// Helper: kelas subquery
function kelasQ($nama)
{
    return "(SELECT id FROM kelas WHERE nama_kelas=" . v($nama) . " LIMIT 1)";
}
// Helper: siswa subquery
function siswaQ($nisn)
{
    return "(SELECT id FROM siswa WHERE nisn=" . v($nisn) . " LIMIT 1)";
}
// Helper: tahun_ajaran subquery
function taQ($nama)
{
    return "(SELECT id FROM tahun_ajaran WHERE nama=" . v($nama) . " LIMIT 1)";
}

// =============== KALENDER ===============
$rows = DB::table('kalender')->get();
echo "Kalender: " . count($rows) . " rows\n";
$sql .= "-- KALENDER (" . count($rows) . " rows)\nDELETE FROM `kalender`;\n";
foreach ($rows as $r) {
    $ta = $r->tahun_ajaran_id ? taQ($taMap[$r->tahun_ajaran_id] ?? '') : 'NULL';
    $guru = ($r->guru_id && isset($guruMap[$r->guru_id])) ? guruQ($guruMap[$r->guru_id]) : 'NULL';
    $sql .= "INSERT INTO `kalender` (`tahun_ajaran_id`,`guru_id`,`tanggal_mulai`,`tanggal_berakhir`,`status_kbm`,`kegiatan`,`created_at`,`updated_at`) VALUES ($ta,$guru," . v($r->tanggal_mulai) . "," . v($r->tanggal_berakhir) . "," . v($r->status_kbm) . "," . v($r->kegiatan) . "," . v($r->created_at) . "," . v($r->updated_at) . ");\n";
}
$sql .= "\n";

// =============== ABSENSI MENGAJAR ===============
$rows = DB::table('absensi_mengajar')->get();
echo "Absensi Mengajar: " . count($rows) . " rows\n";
$sql .= "-- ABSENSI MENGAJAR (" . count($rows) . " rows)\nDELETE FROM `absensi_mengajar`;\n";
$skip = 0;
foreach ($rows as $r) {
    $nip = $guruMap[$r->guru_id] ?? null;
    $j = $jadwalMap[$r->jadwal_id] ?? null;
    if (!$nip || !$j || !$j['nip']) {
        $skip++;
        continue;
    }

    $cols = "`jadwal_id`,`guru_id`,`tanggal`,`status`";
    $vals = jadwalQ($j) . "," . guruQ($nip) . "," . v($r->tanggal) . "," . v($r->status);

    // Dynamic optional columns
    foreach (['materi', 'snapshot_kelas', 'snapshot_mapel', 'snapshot_hari', 'snapshot_jam'] as $col) {
        if (property_exists($r, $col)) {
            $cols .= ",`$col`";
            $vals .= "," . v($r->$col);
        }
    }
    $cols .= ",`created_at`,`updated_at`";
    $vals .= "," . v($r->created_at) . "," . v($r->updated_at);
    $sql .= "INSERT INTO `absensi_mengajar` ($cols) VALUES ($vals);\n";
}
echo "  Skipped: $skip\n";
$sql .= "\n";

// =============== ABSENSI SISWA ===============
// Get actual columns first
$asCols = DB::getSchemaBuilder()->getColumnListing('absensi_siswa');
echo "Absensi Siswa columns: " . implode(', ', $asCols) . "\n";
$rows = DB::table('absensi_siswa')->get();
echo "Absensi Siswa: " . count($rows) . " rows\n";
$sql .= "-- ABSENSI SISWA (" . count($rows) . " rows)\nDELETE FROM `absensi_siswa`;\n";
$skip = 0;
$hasJadwalId = in_array('jadwal_id', $asCols);
$hasKelasId = in_array('kelas_id', $asCols);

foreach ($rows as $r) {
    $nisn = $siswaMap[$r->siswa_id] ?? null;
    if (!$nisn) {
        $skip++;
        continue;
    }

    $cols = "`siswa_id`,`tanggal`,`status`";
    $vals = siswaQ($nisn) . "," . v($r->tanggal) . "," . v($r->status);

    if ($hasKelasId && property_exists($r, 'kelas_id') && $r->kelas_id) {
        $kNama = $kelasMap[$r->kelas_id] ?? null;
        if ($kNama) {
            $cols .= ",`kelas_id`";
            $vals .= "," . kelasQ($kNama);
        }
    }
    if ($hasJadwalId && property_exists($r, 'jadwal_id') && $r->jadwal_id) {
        $j = $jadwalMap[$r->jadwal_id] ?? null;
        if ($j && $j['nip']) {
            $cols .= ",`jadwal_id`";
            $vals .= "," . jadwalQ($j);
        }
    }

    // Other optional columns
    foreach (['keterangan', 'snapshot_kelas', 'snapshot_mapel'] as $col) {
        if (in_array($col, $asCols) && property_exists($r, $col)) {
            $cols .= ",`$col`";
            $vals .= "," . v($r->$col);
        }
    }

    $cols .= ",`created_at`,`updated_at`";
    $vals .= "," . v($r->created_at) . "," . v($r->updated_at);
    $sql .= "INSERT INTO `absensi_siswa` ($cols) VALUES ($vals);\n";
}
echo "  Skipped: $skip\n";
$sql .= "\n";

// =============== ABSENSI RAPAT ===============
$arCols = DB::getSchemaBuilder()->getColumnListing('absensi_rapat');
echo "Absensi Rapat columns: " . implode(', ', $arCols) . "\n";
$rows = DB::table('absensi_rapat')->get();
echo "Absensi Rapat: " . count($rows) . " rows\n";
$sql .= "-- ABSENSI RAPAT (" . count($rows) . " rows)\nDELETE FROM `absensi_rapat`;\n";

foreach ($rows as $r) {
    $nip = (property_exists($r, 'guru_id') && isset($guruMap[$r->guru_id])) ? $guruMap[$r->guru_id] : null;
    if (!$nip)
        continue;

    $cols = "`guru_id`,`status`";
    $vals = guruQ($nip) . "," . v($r->status);

    if (property_exists($r, 'rapat_id')) {
        $cols .= ",`rapat_id`";
        $vals .= "," . v($r->rapat_id);
    }
    if (property_exists($r, 'kegiatan_id')) {
        $cols .= ",`kegiatan_id`";
        $vals .= "," . v($r->kegiatan_id);
    }

    $cols .= ",`created_at`,`updated_at`";
    $vals .= "," . v($r->created_at) . "," . v($r->updated_at);
    $sql .= "INSERT INTO `absensi_rapat` ($cols) VALUES ($vals);\n";
}
$sql .= "\n";

$sql .= "SET FOREIGN_KEY_CHECKS=1;\n";
file_put_contents(__DIR__ . '/import_data.sql', $sql);
echo "\n=== Done! import_data.sql (" . number_format(strlen($sql)) . " bytes) ===\n";
