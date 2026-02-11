<?php
require 'vendor/autoload.php';

use PhpOffice\PhpSpreadsheet\IOFactory;
use Illuminate\Support\Facades\DB;

// Bootstrap Laravel
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

// Load data
$spreadsheet = IOFactory::load('Kalender_Pendidikan_2026-02-07 (1).xlsx');
$sheet = $spreadsheet->getActiveSheet();
$data = $sheet->toArray();

// Get all guru for mapping
$guruMap = [];
$gurus = DB::table('guru')->select('id', 'nama')->get();
foreach ($gurus as $guru) {
    $guruMap[strtolower(trim($guru->nama))] = $guru->id;
}

// Function to parse date
function parseDate($dateStr)
{
    if (empty($dateStr))
        return null;

    // Handle d/m/y or d/m/Y format
    $parts = explode('/', $dateStr);
    if (count($parts) === 3) {
        $day = str_pad($parts[0], 2, '0', STR_PAD_LEFT);
        $month = str_pad($parts[1], 2, '0', STR_PAD_LEFT);
        $year = $parts[2];
        if (strlen($year) == 2) {
            $year = '20' . $year;
        }
        return "$year-$month-$day";
    }
    return null;
}

// Function to find guru ID
function findGuruId($name, $guruMap)
{
    if (empty($name))
        return null;
    $nameLower = strtolower(trim($name));

    // Exact match
    if (isset($guruMap[$nameLower])) {
        return $guruMap[$nameLower];
    }

    // Partial match
    foreach ($guruMap as $guruName => $id) {
        if (strpos($guruName, $nameLower) !== false || strpos($nameLower, $guruName) !== false) {
            return $id;
        }
    }

    return null;
}

$imported = 0;
$skipped = 0;

// Skip header row
for ($i = 1; $i < count($data); $i++) {
    $row = $data[$i];

    // Skip empty rows
    if (empty($row[3])) { // kegiatan empty
        $skipped++;
        continue;
    }

    $tanggalMulai = parseDate($row[1]);
    if (!$tanggalMulai) {
        echo "Skip row $i: invalid date\n";
        $skipped++;
        continue;
    }

    $tanggalBerakhir = parseDate($row[2]);
    $kegiatan = $row[3];
    $statusKbm = ($row[4] === 'Tidak Aktif') ? 'Libur' : 'Aktif';
    $penanggungJawab = $row[5];
    $guruId = findGuruId($penanggungJawab, $guruMap);
    $keterangan = $row[6] ?: 'Kegiatan';
    if ($keterangan !== 'Kegiatan' && $keterangan !== 'Libur') {
        $keterangan = 'Kegiatan';
    }
    $rab = is_numeric($row[7]) ? floatval($row[7]) : null;

    try {
        DB::table('kalender')->insert([
            'tanggal_mulai' => $tanggalMulai,
            'tanggal_berakhir' => $tanggalBerakhir,
            'kegiatan' => $kegiatan,
            'status_kbm' => $statusKbm,
            'guru_id' => $guruId,
            'keterangan' => $keterangan,
            'rab' => $rab,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $imported++;
        echo "Imported: $kegiatan (Guru ID: " . ($guruId ?: 'null') . ")\n";
    } catch (Exception $e) {
        echo "Error row $i: " . $e->getMessage() . "\n";
        $skipped++;
    }
}

echo "\n=== Import Complete ===\n";
echo "Imported: $imported\n";
echo "Skipped: $skipped\n";
