<?php
/**
 * Import Absensi Mengajar Ismail Saleh from ABSEN PAK MAIL.xlsx
 * - Reads Excel, matches mapel+kelas to jadwal
 * - Corrects dates to nearest valid jadwal day
 * - Skips records already in DB
 * - Skips 1 conflict (Row 75)
 */

require 'vendor/autoload.php';
use PhpOffice\PhpSpreadsheet\IOFactory;

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();
use Illuminate\Support\Facades\DB;

// ============ CONFIG ============
$GURU_ID = 10;
$GURU_NAMA = 'Ismail Saleh, S.Pd';

// Jadwal mapping: "mapel|kelas" => jadwal info
$jadwalMap = [
    'Qurdis|X' => ['hari' => 'Sabtu', 'jadwal_id' => 1, 'jam_ke' => '1-2', 'kelas_nama' => 'X ( Sepuluh )', 'mapel_nama' => 'Qurdis'],
    'PKN|XI' => ['hari' => 'Sabtu', 'jadwal_id' => 6, 'jam_ke' => '3-4', 'kelas_nama' => 'XI ( Sebelas )', 'mapel_nama' => 'PKN'],
    'Qurdis|XI' => ['hari' => 'Minggu', 'jadwal_id' => 18, 'jam_ke' => '4-5', 'kelas_nama' => 'XI ( Sebelas )', 'mapel_nama' => 'Qurdis'],
    'PKN|XII' => ['hari' => 'Minggu', 'jadwal_id' => 20, 'jam_ke' => '1-2', 'kelas_nama' => 'XII ( Duabelas )', 'mapel_nama' => 'PKN'],
    'PKN|X' => ['hari' => 'Rabu', 'jadwal_id' => 46, 'jam_ke' => '1-2', 'kelas_nama' => 'X ( Sepuluh )', 'mapel_nama' => 'PKN'],
    'Qurdis|XII' => ['hari' => 'Rabu', 'jadwal_id' => 55, 'jam_ke' => '5-6', 'kelas_nama' => 'XII ( Duabelas )', 'mapel_nama' => 'Qurdis'],
];

$dayNumbers = ['Senin' => 1, 'Selasa' => 2, 'Rabu' => 3, 'Kamis' => 4, 'Jumat' => 5, 'Sabtu' => 6, 'Minggu' => 0];
$dayNames = [0 => 'Minggu', 1 => 'Senin', 2 => 'Selasa', 3 => 'Rabu', 4 => 'Kamis', 5 => 'Jumat', 6 => 'Sabtu'];

// ============ LOAD EXCEL ============
echo "Loading Excel file...\n";
$spreadsheet = IOFactory::load('ABSEN PAK MAIL.xlsx');
$sheet = $spreadsheet->getSheetByName('Lembar1');
$highRow = $sheet->getHighestRow();
echo "Total rows: " . ($highRow - 1) . "\n\n";

// ============ LOAD EXISTING DB DATA ============
$existing = DB::table('absensi_mengajar')
    ->where('guru_id', $GURU_ID)
    ->get()
    ->groupBy(function ($item) {
        return $item->tanggal . '|' . $item->jadwal_id;
    });

echo "Existing absensi in DB: " . DB::table('absensi_mengajar')->where('guru_id', $GURU_ID)->count() . "\n\n";

// ============ PROCESS ROWS ============
$inserted = 0;
$skippedExisting = 0;
$skippedConflict = 0;
$dateFixed = 0;
$errors = [];
$usedKeys = []; // Track keys used in this import to avoid conflicts

for ($row = 2; $row <= $highRow; $row++) {
    // Parse date
    $cell = $sheet->getCell('A' . $row);
    $tanggalRaw = $cell->getValue();

    if (is_numeric($tanggalRaw) && $tanggalRaw > 25000) {
        $dateObj = \PhpOffice\PhpSpreadsheet\Shared\Date::excelToDateTimeObject($tanggalRaw);
    } else {
        $tanggalStr = (string) $tanggalRaw;
        if (preg_match('/^(\d{1,2})\/(\d{1,2})\/(\d{4})/', $tanggalStr, $m)) {
            $dateObj = new DateTime("{$m[3]}-{$m[2]}-{$m[1]}");
        } else {
            $dateObj = new DateTime($tanggalStr);
        }
    }

    $mapel = trim($sheet->getCell('D' . $row)->getValue());
    $kelas = trim($sheet->getCell('G' . $row)->getValue());
    $jamKe = trim($sheet->getCell('E' . $row)->getValue());
    $materi = trim($sheet->getCell('F' . $row)->getValue());
    $beritaAcara = trim($sheet->getCell('H' . $row)->getValue() ?? '');

    // Find jadwal
    $key = "{$mapel}|{$kelas}";
    $jadwal = $jadwalMap[$key] ?? null;

    if (!$jadwal) {
        $errors[] = "Row {$row}: No jadwal match for {$key}";
        continue;
    }

    // Correct date to nearest valid day
    $currentDayNum = (int) $dateObj->format('w');
    $currentDayName = $dayNames[$currentDayNum];
    $expectedDay = $jadwal['hari'];
    $expectedDayNum = $dayNumbers[$expectedDay];

    $finalDate = clone $dateObj;

    if ($currentDayName !== $expectedDay) {
        $diff = $expectedDayNum - $currentDayNum;
        if ($diff > 3)
            $diff -= 7;
        if ($diff < -3)
            $diff += 7;
        $finalDate->modify("{$diff} days");
        $dateFixed++;
    }

    $tanggalStr = $finalDate->format('Y-m-d');
    $checkKey = $tanggalStr . '|' . $jadwal['jadwal_id'];

    // Skip if already in DB
    if (isset($existing[$checkKey])) {
        $skippedExisting++;
        continue;
    }

    // Skip if conflict with another row in this import
    if (isset($usedKeys[$checkKey])) {
        $skippedConflict++;
        echo "  SKIPPED (conflict): Row {$row} - {$mapel} {$kelas} on {$tanggalStr} conflicts with row {$usedKeys[$checkKey]}\n";
        continue;
    }

    $usedKeys[$checkKey] = $row;

    // Build absensi time from original Excel timestamp if available
    $absensiTime = null;
    if (is_numeric($tanggalRaw) && $tanggalRaw > 25000) {
        $fullDateTime = \PhpOffice\PhpSpreadsheet\Shared\Date::excelToDateTimeObject($tanggalRaw);
        // Only use time if date had time component (fractional part)
        if (($tanggalRaw - floor($tanggalRaw)) > 0) {
            $absensiTime = $finalDate->format('Y-m-d') . ' ' . $fullDateTime->format('H:i:s');
        }
    }

    // Insert
    $now = now();
    DB::table('absensi_mengajar')->insert([
        'jadwal_id' => $jadwal['jadwal_id'],
        'guru_id' => $GURU_ID,
        'snapshot_kelas' => $jadwal['kelas_nama'],
        'snapshot_mapel' => $jadwal['mapel_nama'],
        'snapshot_jam' => $jadwal['jam_ke'],
        'snapshot_hari' => $jadwal['hari'],
        'snapshot_guru_nama' => $GURU_NAMA,
        'tanggal' => $tanggalStr,
        'ringkasan_materi' => $materi ?: null,
        'berita_acara' => $beritaAcara ?: null,
        'status' => 'hadir',
        'guru_status' => 'H',
        'guru_keterangan' => null,
        'guru_tugas_id' => null,
        'siswa_hadir' => 0,
        'siswa_sakit' => 0,
        'siswa_izin' => 0,
        'siswa_alpha' => 0,
        'tugas_siswa' => null,
        'absensi_time' => $absensiTime,
        'created_at' => $now,
        'updated_at' => $now,
    ]);

    $dateInfo = ($currentDayName !== $expectedDay) ? " (corrected from {$dateObj->format('Y-m-d')} {$currentDayName})" : "";
    echo "  INSERTED: {$tanggalStr} ({$jadwal['hari']}){$dateInfo} | {$mapel} {$kelas} jam {$jadwal['jam_ke']} | " . substr($materi, 0, 60) . "\n";
    $inserted++;
}

// ============ SUMMARY ============
echo "\n" . str_repeat('=', 60) . "\n";
echo "IMPORT COMPLETE\n";
echo str_repeat('=', 60) . "\n";
echo "Inserted:        {$inserted}\n";
echo "Skipped (exist): {$skippedExisting}\n";
echo "Skipped (conflict): {$skippedConflict}\n";
echo "Dates corrected: {$dateFixed}\n";

if (!empty($errors)) {
    echo "\nErrors:\n";
    foreach ($errors as $err) {
        echo "  - {$err}\n";
    }
}

$totalNow = DB::table('absensi_mengajar')->where('guru_id', $GURU_ID)->count();
echo "\nTotal absensi Ismail Saleh in DB now: {$totalNow}\n";
