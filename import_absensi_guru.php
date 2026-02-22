<?php
/**
 * Import Absensi Mengajar from ABSEN GURU.xlsx for ALL teachers
 * - Normalizes guru names (typo variants -> DB names)
 * - Normalizes mapel names (typo variants -> DB mapel names)
 * - Matches each row to the correct jadwal based on guru+mapel+kelas
 * - Corrects dates to nearest valid jadwal day
 * - Skips records already in DB
 */

require 'vendor/autoload.php';
use PhpOffice\PhpSpreadsheet\IOFactory;

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();
use Illuminate\Support\Facades\DB;

// ============ GURU NAME -> DB ID MAPPING ============
// Handles typo variants in Excel
$guruNameMap = [
    'Agus Amin' => 11,
    'Agus Amin, S.Ag' => 11,
    'Agus Amin, S.Ag.' => 11,
    'Dewi Rokhillah Faukillah, S.Pd' => 8,
    'Didi Madhari' => 6,
    'M. Arief Arfan, S.Pd.' => 12,
    'M. Ihdisyiroth Nur, S.Pd.' => 4,
    'M. Muammal' => 7,
    'M. Zaenal Abidin' => 2,
    'Maafi, S.Pd.' => 5,
    'Muhammad Akrom Adabi, M.Ag.' => 3,
    'Muhammad Irham' => 14,
    'Muhammad Muntaha' => 15,
    'Rino Mukti, S. Pd' => 13,
    'Syahrul Adlul Gani' => 9,
];

// ============ GURU ID -> DISPLAY NAME ============
$guruDisplayName = [
    2 => 'M. Zaenal Abidin',
    3 => 'Muhammad Akrom Adabi, M.Ag.',
    4 => 'M. Ihdisyiroth Nur, S.Pd.',
    5 => 'Maafi, S.Pd.',
    6 => 'Didi Madhari',
    7 => 'M. Muammal',
    8 => 'Dewi Rokhillah Faukillah, S.Pd',
    9 => 'Syahrul Adlul Gani',
    11 => 'Agus Amin, S.Ag',
    12 => 'M. Arief Arfan, S.Pd.',
    13 => 'Rino Mukti, S. Pd',
    14 => 'Muhammad Irham',
    15 => 'Muhammad Muntaha',
];

// ============ MAPEL NAME NORMALIZATION ============
// Excel mapel name variants -> normalized DB mapel name
function normalizeMapel($mapel)
{
    $mapel = trim($mapel);
    $lower = mb_strtolower($mapel);

    // B. Indonesia variants
    if (in_array($lower, ['b. indonesia', 'bahasa indonesia', 'bahasa indonexia', 'bahasa indonesis', 'bahasa indobesia']))
        return 'B. Indonesia';

    // B. Arab variants (with Muhadatsah combo)
    if (preg_match('/^b\.?\s*arab.*muha/i', $mapel))
        return 'B. Arab + Muhadasah';
    if (preg_match('/^b\.?\s*arab/i', $mapel) && !preg_match('/pem/i', $mapel))
        return 'B. Arab';
    if (preg_match('/^bahasa\s+arab$/i', $mapel))
        return 'B. Arab';

    // Muhadatsah/Muhadasah standalone
    if (preg_match('/^muha(d[ae]t?s[ah]b?|d[ae]tsah|dasah)$/i', $mapel))
        return 'Muhadasah';

    // B. Arab Pem
    if (preg_match('/b\.?\s*arab\s*pem/i', $mapel))
        return 'B. Arab Pem';
    if ($lower === 'bahasa arab peminatan')
        return 'B. Arab Pem';

    // B. Inggris variants
    if (preg_match('/^b\.?\s*inggris$/i', $mapel))
        return 'B. Inggris';
    if (preg_match('/^bahasa\s+inggris$/i', $mapel))
        return 'B. Inggris';

    // Conversation
    if ($lower === 'conversation')
        return 'Conversation';

    // BK
    if (in_array($lower, ['bimbingan konseling', 'bk']))
        return 'Bimbingan Konseling';

    // IT Komputer variants
    if (preg_match('/^(it\s*komputer|prakarya\s*wirausaha)$/i', $mapel))
        return 'IT Komputer';

    // Tahfidz variants
    if (preg_match('/^ta[ah]?fidz?h?$/i', $mapel))
        return 'Tahfidz';
    if ($lower === 'tahfidz')
        return 'Tahfidz';
    if ($lower === 'taahfid')
        return 'Tahfidz';
    if ($lower === 'tahfidh')
        return 'Tahfidz';
    if ($lower === 'tahfidz')
        return 'Tahfidz';

    // Tajwid variants
    if (preg_match('/^tajwid/i', $mapel))
        return 'Tajwid';

    // Others - return as-is
    return $mapel;
}

// ============ KELAS SNAPSHOT NAMES ============
$kelasSnapshot = [
    'X' => 'X ( Sepuluh )',
    'XI' => 'XI ( Sebelas )',
    'XII' => 'XII ( Duabelas )',
];

$kelasIds = ['X' => 43, 'XI' => 44, 'XII' => 45];

// ============ JADWAL LOOKUP TABLE ============
// Key: "guru_id|mapel_db|kelas" -> jadwal info
// Built from DB jadwal data
$jadwalLookup = [
    // Guru 2 - M. Zaenal Abidin
    '2|SKI|XI' => ['jadwal_id' => 53, 'hari' => 'Rabu', 'jam_ke' => '7-8'],
    '2|SKI|X' => ['jadwal_id' => 4, 'hari' => 'Sabtu', 'jam_ke' => '7-8'],
    '2|SKI|XII' => ['jadwal_id' => 11, 'hari' => 'Sabtu', 'jam_ke' => '5-6'],

    // Guru 3 - Muhammad Akrom Adabi
    '3|Fikih|X' => ['jadwal_id' => 25, 'hari' => 'Senin', 'jam_ke' => '4-5'],
    '3|Fikih|XII' => ['jadwal_id' => 32, 'hari' => 'Senin', 'jam_ke' => '2-3'],
    '3|B. Arab Pem|XII' => ['jadwal_id' => 43, 'hari' => 'Selasa', 'jam_ke' => '3-4'],
    '3|Fikih|XI' => ['jadwal_id' => 50, 'hari' => 'Rabu', 'jam_ke' => '1-2'],
    '3|B. Arab Pem|XI' => ['jadwal_id' => 5, 'hari' => 'Sabtu', 'jam_ke' => '1-2'],

    // Guru 4 - M. Ihdisyiroth Nur
    '4|IT Komputer|XI' => ['jadwal_id' => 28, 'hari' => 'Senin', 'jam_ke' => '2-4'],
    '4|IT Komputer|XII' => ['jadwal_id' => 34, 'hari' => 'Senin', 'jam_ke' => '6-8'],
    '4|IT Komputer|X' => ['jadwal_id' => 36, 'hari' => 'Selasa', 'jam_ke' => '4-6'],

    // Guru 5 - Maafi
    '5|Akidah Akhlak|XI' => ['jadwal_id' => 7, 'hari' => 'Sabtu', 'jam_ke' => '5-6'],
    '5|Akidah Akhlak|XII' => ['jadwal_id' => 10, 'hari' => 'Sabtu', 'jam_ke' => '3-4'],
    '5|Akidah Akhlak|X' => ['jadwal_id' => 14, 'hari' => 'Minggu', 'jam_ke' => '3-4'],

    // Guru 6 - Didi Madhari
    '6|B. Arab Pem|X' => ['jadwal_id' => 24, 'hari' => 'Senin', 'jam_ke' => '2-3'],
    '6|Bimbingan Konseling|XI' => ['jadwal_id' => 8, 'hari' => 'Sabtu', 'jam_ke' => '7-8'],
    '6|Bimbingan Konseling|X' => ['jadwal_id' => 15, 'hari' => 'Minggu', 'jam_ke' => '5-6'],
    // No jadwal for BK XII - check below

    // Guru 7 - M. Muammal (Tahfidz only)
    '7|Tahfidz|XI_senin' => ['jadwal_id' => 29, 'hari' => 'Senin', 'jam_ke' => '5-6'],
    '7|Tahfidz|XII_selasa' => ['jadwal_id' => 44, 'hari' => 'Selasa', 'jam_ke' => '5-6'],
    '7|Tahfidz|XI_selasa' => ['jadwal_id' => 41, 'hari' => 'Selasa', 'jam_ke' => '7-8'],
    '7|Tahfidz|XII_rabu' => ['jadwal_id' => 56, 'hari' => 'Rabu', 'jam_ke' => '7-8'],
    '7|Tahfidz|X_kamis' => ['jadwal_id' => 60, 'hari' => 'Kamis', 'jam_ke' => '7-8'],
    '7|Tahfidz|XII_kamis' => ['jadwal_id' => 68, 'hari' => 'Kamis', 'jam_ke' => '7-8'],
    '7|Tahfidz|XI_kamis' => ['jadwal_id' => 64, 'hari' => 'Kamis', 'jam_ke' => '7-8'],

    // Guru 8 - Dewi Rokhillah (B. Arab + Muhadasah)
    '8|Muhadasah|X' => ['jadwal_id' => 47, 'hari' => 'Rabu', 'jam_ke' => '3-4'],
    '8|B. Arab|XI' => ['jadwal_id' => 52, 'hari' => 'Rabu', 'jam_ke' => '5-6'],
    '8|Muhadasah|XI' => ['jadwal_id' => 63, 'hari' => 'Kamis', 'jam_ke' => '5-6'],
    '8|B. Arab|XII' => ['jadwal_id' => 66, 'hari' => 'Kamis', 'jam_ke' => '3-4'],
    '8|B. Arab|X' => ['jadwal_id' => 2, 'hari' => 'Sabtu', 'jam_ke' => '3-4'],
    '8|Muhadasah|XII' => ['jadwal_id' => 9, 'hari' => 'Sabtu', 'jam_ke' => '1-2'],

    // Guru 9 - Syahrul Adlul Gani
    '9|B. Inggris|X' => ['jadwal_id' => 26, 'hari' => 'Senin', 'jam_ke' => '6-7'],
    '9|Conversation|XII' => ['jadwal_id' => 33, 'hari' => 'Senin', 'jam_ke' => '4-5'],
    '9|Conversation|X' => ['jadwal_id' => 37, 'hari' => 'Selasa', 'jam_ke' => '7-8'],
    '9|B. Inggris|XI' => ['jadwal_id' => 40, 'hari' => 'Selasa', 'jam_ke' => '5-6'],
    '9|B. Inggris|XII' => ['jadwal_id' => 67, 'hari' => 'Kamis', 'jam_ke' => '5-6'],
    '9|Conversation|XI' => ['jadwal_id' => 62, 'hari' => 'Kamis', 'jam_ke' => '3-4'],

    // Guru 11 - Agus Amin
    '11|B. Indonesia|X' => ['jadwal_id' => 13, 'hari' => 'Minggu', 'jam_ke' => '1-2'],
    '11|B. Indonesia|XI' => ['jadwal_id' => 19, 'hari' => 'Minggu', 'jam_ke' => '6-8'],
    '11|B. Indonesia|XII' => ['jadwal_id' => 21, 'hari' => 'Minggu', 'jam_ke' => '3-5'],

    // Guru 12 - M. Arief Arfan
    '12|Matematika|XI_selasa' => ['jadwal_id' => 39, 'hari' => 'Selasa', 'jam_ke' => '3-4'],
    '12|Matematika|XII' => ['jadwal_id' => 45, 'hari' => 'Selasa', 'jam_ke' => '7-8'],
    '12|Matematika|X_rabu' => ['jadwal_id' => 49, 'hari' => 'Rabu', 'jam_ke' => '7-8'],
    '12|Matematika|XI_rabu' => ['jadwal_id' => 51, 'hari' => 'Rabu', 'jam_ke' => '3-4'],
    '12|Matematika|X_sabtu' => ['jadwal_id' => 3, 'hari' => 'Sabtu', 'jam_ke' => '5-6'],
    '12|Matematika|XII_sabtu' => ['jadwal_id' => 12, 'hari' => 'Sabtu', 'jam_ke' => '7-8'],

    // Guru 13 - Rino Mukti
    '13|Aswaja|XI' => ['jadwal_id' => 38, 'hari' => 'Selasa', 'jam_ke' => '1-2'],
    '13|Aswaja|X' => ['jadwal_id' => 59, 'hari' => 'Kamis', 'jam_ke' => '5-6'],
    '13|Aswaja|XII' => ['jadwal_id' => 22, 'hari' => 'Minggu', 'jam_ke' => '7-8'],

    // Guru 14 - Muhammad Irham
    '14|Olahraga|X' => ['jadwal_id' => 35, 'hari' => 'Selasa', 'jam_ke' => '1-3'],
    '14|Olahraga|XII' => ['jadwal_id' => 54, 'hari' => 'Rabu', 'jam_ke' => '1-3'],
    '14|Olahraga|XI' => ['jadwal_id' => 17, 'hari' => 'Minggu', 'jam_ke' => '1-3'],

    // Guru 15 - Muhammad Muntaha
    '15|Tajwid|XI' => ['jadwal_id' => 30, 'hari' => 'Senin', 'jam_ke' => '7-8'],
    '15|Tajwid|XII' => ['jadwal_id' => 42, 'hari' => 'Selasa', 'jam_ke' => '1-2'],
    '15|Tahfidz|X_rabu' => ['jadwal_id' => 48, 'hari' => 'Rabu', 'jam_ke' => '5-6'],
    '15|Tajwid|X' => ['jadwal_id' => 58, 'hari' => 'Kamis', 'jam_ke' => '3-4'],
    '15|Tahfidz|X_minggu' => ['jadwal_id' => 16, 'hari' => 'Minggu', 'jam_ke' => '7-8'],
];

$dayNumbers = ['Senin' => 1, 'Selasa' => 2, 'Rabu' => 3, 'Kamis' => 4, 'Jumat' => 5, 'Sabtu' => 6, 'Minggu' => 0];
$dayNames = [0 => 'Minggu', 1 => 'Senin', 2 => 'Selasa', 3 => 'Rabu', 4 => 'Kamis', 5 => 'Jumat', 6 => 'Sabtu'];

// ============ JADWAL RESOLVER ============
// For some teachers, same mapel+kelas teaches on multiple days
// We need to resolve based on closest day match
function resolveJadwal($guruId, $normalizedMapel, $kelas, $currentDay, $jadwalLookup, $dayNumbers)
{
    // Try direct lookup first
    $directKey = "{$guruId}|{$normalizedMapel}|{$kelas}";
    if (isset($jadwalLookup[$directKey])) {
        return $jadwalLookup[$directKey];
    }

    // For Dewi (guru 8): "B. Arab + Muhadasah" combo needs splitting
    if ($guruId == 8 && $normalizedMapel == 'B. Arab + Muhadasah') {
        // Dewi teaches B. Arab and Muhadasah separately
        // Muhadasah: X=Rabu(3-4), XI=Kamis(5-6), XII=Sabtu(1-2)
        // B. Arab: X=Sabtu(3-4), XI=Rabu(5-6), XII=Kamis(3-4)
        // For combo entries, match based on kelas+jam_ke or nearest day
        // Rabu/Sabtu for X -> try Muhadasah on Rabu, B. Arab on Sabtu
        // Rabu/Kamis for XI -> B. Arab on Rabu, Muhadasah on Kamis
        // Kamis/Sabtu for XII -> B. Arab on Kamis, Muhadasah on Sabtu

        $currentDayNum = $dayNumbers[$currentDay] ?? -1;

        if ($kelas == 'X') {
            // X: Muhadasah=Rabu(47), B.Arab=Sabtu(2)
            $rabuDist = abs(($dayNumbers['Rabu'] - $currentDayNum + 7) % 7);
            $sabtuDist = abs(($dayNumbers['Sabtu'] - $currentDayNum + 7) % 7);
            if ($rabuDist > 3)
                $rabuDist = 7 - $rabuDist;
            if ($sabtuDist > 3)
                $sabtuDist = 7 - $sabtuDist;
            return $rabuDist <= $sabtuDist
                ? $jadwalLookup['8|Muhadasah|X']
                : $jadwalLookup['8|B. Arab|X'];
        }
        if ($kelas == 'XI') {
            // XI: B.Arab=Rabu(52), Muhadasah=Kamis(63)
            $rabuDist = abs(($dayNumbers['Rabu'] - $currentDayNum + 7) % 7);
            $kamisDist = abs(($dayNumbers['Kamis'] - $currentDayNum + 7) % 7);
            if ($rabuDist > 3)
                $rabuDist = 7 - $rabuDist;
            if ($kamisDist > 3)
                $kamisDist = 7 - $kamisDist;
            return $rabuDist <= $kamisDist
                ? $jadwalLookup['8|B. Arab|XI']
                : $jadwalLookup['8|Muhadasah|XI'];
        }
        if ($kelas == 'XII') {
            // XII: B.Arab=Kamis(66), Muhadasah=Sabtu(9)
            $kamisDist = abs(($dayNumbers['Kamis'] - $currentDayNum + 7) % 7);
            $sabtuDist = abs(($dayNumbers['Sabtu'] - $currentDayNum + 7) % 7);
            if ($kamisDist > 3)
                $kamisDist = 7 - $kamisDist;
            if ($sabtuDist > 3)
                $sabtuDist = 7 - $sabtuDist;
            return $kamisDist <= $sabtuDist
                ? $jadwalLookup['8|B. Arab|XII']
                : $jadwalLookup['8|Muhadasah|XII'];
        }
    }

    // For teachers with multiple jadwal for same mapel+kelas on different days
    // Try suffixed keys with day matching
    $candidates = [];
    foreach ($jadwalLookup as $key => $jadwal) {
        if (str_starts_with($key, "{$guruId}|{$normalizedMapel}|{$kelas}")) {
            $candidates[] = $jadwal;
        }
    }

    if (count($candidates) == 1) {
        return $candidates[0];
    }

    if (count($candidates) > 1) {
        // Find closest day
        $currentDayNum = $dayNumbers[$currentDay] ?? -1;
        $best = null;
        $bestDist = 999;
        foreach ($candidates as $c) {
            $targetDayNum = $dayNumbers[$c['hari']];
            $dist = abs($targetDayNum - $currentDayNum);
            if ($dist > 3)
                $dist = 7 - $dist;
            if ($dist < $bestDist) {
                $bestDist = $dist;
                $best = $c;
            }
        }
        return $best;
    }

    return null;
}

// ============ SPECIAL: Didi Madhari BK XII ============
// Excel has BK XII but no jadwal in DB for it. 
// We'll use BK XI jadwal (id=8, Sabtu 7-8) as fallback since it's same guru

// ============ LOAD EXCEL ============
echo "Loading Excel file...\n";
$spreadsheet = IOFactory::load('ABSEN GURU.xlsx');
$sheet = $spreadsheet->getSheetByName('Lembar1');
$highRow = $sheet->getHighestRow();
echo "Total rows: " . ($highRow - 1) . "\n\n";

// ============ LOAD EXISTING DB DATA ============
$existing = DB::table('absensi_mengajar')
    ->get()
    ->groupBy(function ($item) {
        return $item->guru_id . '|' . $item->tanggal . '|' . $item->jadwal_id;
    });

// ============ PROCESS ROWS ============
$inserted = 0;
$skippedExisting = 0;
$skippedConflict = 0;
$skippedNoJadwal = 0;
$skippedNoGuru = 0;
$skippedEmptyMapel = 0;
$dateFixed = 0;
$usedKeys = [];
$perGuru = [];
$warnings = [];

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
            try {
                $dateObj = new DateTime($tanggalStr);
            } catch (Exception $e) {
                $warnings[] = "Row {$row}: Cannot parse date '{$tanggalStr}'";
                continue;
            }
        }
    }

    $namaGuru = trim($sheet->getCell('B' . $row)->getValue());
    $mapelRaw = trim($sheet->getCell('D' . $row)->getValue());
    $kelas = trim($sheet->getCell('G' . $row)->getValue());
    $jamKe = trim($sheet->getCell('E' . $row)->getValue());
    $materi = trim($sheet->getCell('F' . $row)->getValue());
    $beritaAcara = trim($sheet->getCell('H' . $row)->getValue() ?? '');

    // Skip empty mapel
    if (!$mapelRaw) {
        $skippedEmptyMapel++;
        continue;
    }

    // Resolve guru
    $guruId = $guruNameMap[$namaGuru] ?? null;
    if (!$guruId) {
        $skippedNoGuru++;
        $warnings[] = "Row {$row}: Unknown guru '{$namaGuru}'";
        continue;
    }

    // Normalize mapel
    $normalizedMapel = normalizeMapel($mapelRaw);

    // Special handling for mapel names that are actually materi (Syahrul typos)
    if (in_array($normalizedMapel, ['Pemanasan di Task 6. Latihan Pronounce the words', 'Mencatat Recount text'])) {
        // These are actually materi put in mapel column for Syahrul - resolve from context
        // Both are for kelas X -> Conversation X (jadwal 37)
        $normalizedMapel = 'Conversation';
        if (!$materi)
            $materi = $mapelRaw; // Use the mapel text as materi
    }

    // Get current day
    $currentDayNum = (int) $dateObj->format('w');
    $currentDayName = $dayNames[$currentDayNum];

    // Resolve jadwal
    $jadwal = resolveJadwal($guruId, $normalizedMapel, $kelas, $currentDayName, $jadwalLookup, $dayNumbers);

    // Special fallback for Didi BK XII
    if (!$jadwal && $guruId == 6 && $normalizedMapel == 'Bimbingan Konseling' && $kelas == 'XII') {
        // No dedicated jadwal for BK XII, use BK XI slot as reference
        // but set snapshot correctly
        $jadwal = ['jadwal_id' => 8, 'hari' => 'Sabtu', 'jam_ke' => '5-6'];
    }

    if (!$jadwal) {
        $skippedNoJadwal++;
        $warnings[] = "Row {$row}: No jadwal for guru={$guruId} mapel='{$normalizedMapel}' kelas={$kelas} (raw: '{$mapelRaw}')";
        continue;
    }

    // Correct date to nearest valid day
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
    $checkKey = $guruId . '|' . $tanggalStr . '|' . $jadwal['jadwal_id'];

    // Skip if already in DB
    if (isset($existing[$checkKey])) {
        $skippedExisting++;
        continue;
    }

    // Skip if conflict with another row in this import
    if (isset($usedKeys[$checkKey])) {
        $skippedConflict++;
        continue;
    }
    $usedKeys[$checkKey] = $row;

    // Build absensi time
    $absensiTime = null;
    if (is_numeric($tanggalRaw) && $tanggalRaw > 25000) {
        $fullDateTime = \PhpOffice\PhpSpreadsheet\Shared\Date::excelToDateTimeObject($tanggalRaw);
        if (($tanggalRaw - floor($tanggalRaw)) > 0) {
            $absensiTime = $finalDate->format('Y-m-d') . ' ' . $fullDateTime->format('H:i:s');
        }
    }

    // Determine snapshot mapel name from jadwal
    $snapshotMapel = $normalizedMapel;
    if ($snapshotMapel == 'B. Arab + Muhadasah') {
        // Use the actual jadwal's mapel name
        $jId = $jadwal['jadwal_id'];
        $dbMapel = DB::table('jadwal')
            ->join('mapel', 'jadwal.mapel_id', '=', 'mapel.id')
            ->where('jadwal.id', $jId)
            ->value('mapel.nama_mapel');
        $snapshotMapel = $dbMapel ?: $normalizedMapel;
    }

    $displayName = $guruDisplayName[$guruId] ?? $namaGuru;

    // Insert
    $now = now();
    DB::table('absensi_mengajar')->insert([
        'jadwal_id' => $jadwal['jadwal_id'],
        'guru_id' => $guruId,
        'snapshot_kelas' => $kelasSnapshot[$kelas] ?? $kelas,
        'snapshot_mapel' => $snapshotMapel,
        'snapshot_jam' => $jadwal['jam_ke'],
        'snapshot_hari' => $jadwal['hari'],
        'snapshot_guru_nama' => $displayName,
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

    $inserted++;
    if (!isset($perGuru[$displayName]))
        $perGuru[$displayName] = 0;
    $perGuru[$displayName]++;
}

// ============ SUMMARY ============
echo str_repeat('=', 60) . "\n";
echo "IMPORT COMPLETE\n";
echo str_repeat('=', 60) . "\n";
echo "Inserted:            {$inserted}\n";
echo "Skipped (exist):     {$skippedExisting}\n";
echo "Skipped (conflict):  {$skippedConflict}\n";
echo "Skipped (no jadwal): {$skippedNoJadwal}\n";
echo "Skipped (no guru):   {$skippedNoGuru}\n";
echo "Skipped (no mapel):  {$skippedEmptyMapel}\n";
echo "Dates corrected:     {$dateFixed}\n";

echo "\n=== PER GURU INSERTED ===\n";
ksort($perGuru);
foreach ($perGuru as $name => $count) {
    echo "  {$name}: {$count}\n";
}

if (!empty($warnings)) {
    echo "\n=== WARNINGS (" . count($warnings) . ") ===\n";
    foreach ($warnings as $w) {
        echo "  - {$w}\n";
    }
}

echo "\n=== FINAL DB COUNTS ===\n";
$counts = DB::table('absensi_mengajar')
    ->join('guru', 'absensi_mengajar.guru_id', '=', 'guru.id')
    ->select('guru.nama', DB::raw('COUNT(*) as cnt'))
    ->groupBy('guru.nama')
    ->orderBy('guru.nama')
    ->get();
foreach ($counts as $c) {
    echo "  {$c->nama}: {$c->cnt}\n";
}
