<?php
/**
 * Import Absensi Siswa from ABSEN SISWA.xlsx
 * - Only imports for students that exist in DB (skip unmatched)
 * - Only stores S/I/A records (H/hadir is not stored, assumed by absence of record)
 * - Handles duplicates with ASIH priority: A > S > I > H (keep worst status)
 * - Updates absensi_mengajar siswa counts after importing
 */

require 'vendor/autoload.php';
use PhpOffice\PhpSpreadsheet\IOFactory;

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();
use Illuminate\Support\Facades\DB;

// ============ CONSTANTS ============
$kelasMap = [
    'X ( SEPULUH )' => 43,
    'X (SEPULUH)' => 43,
    'XI ( SEBELAS )' => 44,
    'XI' => 44,
    'XII ( DUABELAS )' => 45,
];

$kelasNames = [43 => 'X', 44 => 'XI', 45 => 'XII'];

$statusMap = [
    'SAKIT' => 'S',
    'ALPA' => 'A',
    'IZIN' => 'I',
    'HADIR' => 'H',
];

// ASIH priority: A=3, S=2, I=1, H=0 (keep highest/worst)
$statusPriority = ['H' => 0, 'I' => 1, 'S' => 2, 'A' => 3];

// ============ BUILD SISWA LOOKUP ============
$siswaList = DB::table('siswa')->get();
$siswaByName = [];
foreach ($siswaList as $s) {
    $siswaByName[mb_strtoupper(trim($s->nama))] = $s;
}

// Total students per kelas
$totalPerKelas = [];
foreach ($siswaList as $s) {
    $kId = $s->kelas_id;
    $totalPerKelas[$kId] = ($totalPerKelas[$kId] ?? 0) + 1;
}

echo "Siswa in DB: " . $siswaList->count() . "\n";
echo "Per kelas: " . json_encode($totalPerKelas) . "\n\n";

// ============ LOAD EXISTING ABSENSI SISWA ============
$existingAbsensi = DB::table('absensi_siswa')
    ->get()
    ->keyBy(function ($item) {
        return $item->siswa_id . '|' . $item->tanggal;
    });
echo "Existing absensi_siswa: " . $existingAbsensi->count() . "\n\n";

// ============ LOAD EXCEL ============
echo "Loading Excel file...\n";
$spreadsheet = IOFactory::load('ABSEN SISWA.xlsx');
$sheet = $spreadsheet->getSheetByName('Lembar1');
$highRow = $sheet->getHighestRow();
echo "Total rows: " . ($highRow - 1) . "\n\n";

// ============ PARSE ALL ROWS INTO RECORDS ============
// First pass: parse all rows and group by siswa_id + tanggal
$allRecords = []; // key: "siswa_id|tanggal" -> ['status' => ..., 'keterangan' => ..., 'kelas_id' => ...]
$skippedNoMatch = 0;
$skippedEmptyStatus = 0;
$skippedHadir = 0;
$duplicateResolved = 0;
$totalParsed = 0;

for ($row = 2; $row <= $highRow; $row++) {
    $nama = mb_strtoupper(trim($sheet->getCell('B' . $row)->getValue()));
    if (!$nama)
        continue;

    $totalParsed++;

    // Match siswa
    $siswa = $siswaByName[$nama] ?? null;
    if (!$siswa) {
        $skippedNoMatch++;
        continue;
    }

    // Parse status
    $statusRaw = mb_strtoupper(trim($sheet->getCell('D' . $row)->getValue()));
    if (!$statusRaw || !isset($statusMap[$statusRaw])) {
        // Empty or unknown status → treat as hadir
        $skippedEmptyStatus++;
        continue;
    }

    $status = $statusMap[$statusRaw];

    // Skip hadir (not stored in DB)
    if ($status === 'H') {
        $skippedHadir++;
        continue;
    }

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
            continue;
        }
    }

    $tanggal = $dateObj->format('Y-m-d');
    $kelas = trim($sheet->getCell('C' . $row)->getValue());
    $kelasId = $kelasMap[$kelas] ?? $siswa->kelas_id;
    $keterangan = trim($sheet->getCell('E' . $row)->getValue() ?? '');

    $key = $siswa->id . '|' . $tanggal;

    // Handle duplicates: ASIH priority (A > S > I > H, keep worst)
    if (isset($allRecords[$key])) {
        $existingPriority = $statusPriority[$allRecords[$key]['status']];
        $newPriority = $statusPriority[$status];

        if ($newPriority > $existingPriority) {
            // New status is "worse", replace
            $allRecords[$key] = [
                'siswa_id' => $siswa->id,
                'tanggal' => $tanggal,
                'kelas_id' => $kelasId,
                'status' => $status,
                'keterangan' => $keterangan,
            ];
            $duplicateResolved++;
        } else {
            $duplicateResolved++;
        }
    } else {
        $allRecords[$key] = [
            'siswa_id' => $siswa->id,
            'tanggal' => $tanggal,
            'kelas_id' => $kelasId,
            'status' => $status,
            'keterangan' => $keterangan,
        ];
    }
}

echo "Parsed: {$totalParsed}\n";
echo "Unique records (after dedup): " . count($allRecords) . "\n";
echo "Skipped (no siswa match): {$skippedNoMatch}\n";
echo "Skipped (empty status): {$skippedEmptyStatus}\n";
echo "Skipped (hadir): {$skippedHadir}\n";
echo "Duplicates resolved (ASIH): {$duplicateResolved}\n\n";

// ============ INSERT / UPDATE RECORDS ============
$inserted = 0;
$updated = 0;
$skippedSame = 0;
$now = now();

foreach ($allRecords as $key => $rec) {
    $existingKey = $rec['siswa_id'] . '|' . $rec['tanggal'];

    if (isset($existingAbsensi[$existingKey])) {
        $existing = $existingAbsensi[$existingKey];

        // Check ASIH priority
        $existingPriority = $statusPriority[$existing->status] ?? 0;
        $newPriority = $statusPriority[$rec['status']];

        if ($newPriority > $existingPriority) {
            // Update to worse status
            DB::table('absensi_siswa')
                ->where('id', $existing->id)
                ->update([
                    'status' => $rec['status'],
                    'keterangan' => $rec['keterangan'] ?: $existing->keterangan,
                    'updated_at' => $now,
                ]);
            $updated++;
        } else {
            $skippedSame++;
        }
    } else {
        // Insert new
        DB::table('absensi_siswa')->insert([
            'tanggal' => $rec['tanggal'],
            'kelas_id' => $rec['kelas_id'],
            'siswa_id' => $rec['siswa_id'],
            'status' => $rec['status'],
            'keterangan' => $rec['keterangan'] ?: null,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
        $inserted++;
    }
}

echo "=== ABSENSI SISWA IMPORT ===\n";
echo "Inserted: {$inserted}\n";
echo "Updated (ASIH): {$updated}\n";
echo "Skipped (same/lower priority): {$skippedSame}\n\n";

// ============ UPDATE ABSENSI MENGAJAR COUNTS ============
echo "Updating absensi_mengajar siswa counts...\n";

// Get all absensi_mengajar
$absensiMengajar = DB::table('absensi_mengajar')
    ->select('id', 'jadwal_id', 'tanggal', 'snapshot_kelas')
    ->get();

$kelasSnapshotMap = [
    'X ( Sepuluh )' => 43,
    'XI ( Sebelas )' => 44,
    'XII ( Duabelas )' => 45,
];

// Pre-build absensi_siswa counts per tanggal+kelas
$siswaCountsByDateKelas = DB::table('absensi_siswa')
    ->select('tanggal', 'kelas_id', 'status', DB::raw('COUNT(*) as cnt'))
    ->groupBy('tanggal', 'kelas_id', 'status')
    ->get()
    ->groupBy(function ($item) {
        return $item->tanggal . '|' . $item->kelas_id;
    });

$updatedMengajar = 0;

foreach ($absensiMengajar as $am) {
    // Resolve kelas_id from snapshot or jadwal
    $kelasId = $kelasSnapshotMap[$am->snapshot_kelas] ?? null;

    if (!$kelasId && $am->jadwal_id) {
        $jadwal = DB::table('jadwal')->where('id', $am->jadwal_id)->first();
        if ($jadwal)
            $kelasId = $jadwal->kelas_id;
    }

    if (!$kelasId)
        continue;

    $totalStudents = $totalPerKelas[$kelasId] ?? 0;
    $dateKelasKey = $am->tanggal . '|' . $kelasId;

    $sakit = 0;
    $izin = 0;
    $alpha = 0;

    if (isset($siswaCountsByDateKelas[$dateKelasKey])) {
        foreach ($siswaCountsByDateKelas[$dateKelasKey] as $row) {
            if ($row->status === 'S')
                $sakit = $row->cnt;
            if ($row->status === 'I')
                $izin = $row->cnt;
            if ($row->status === 'A')
                $alpha = $row->cnt;
        }
    }

    $hadir = max(0, $totalStudents - $sakit - $izin - $alpha);

    DB::table('absensi_mengajar')
        ->where('id', $am->id)
        ->update([
            'siswa_hadir' => $hadir,
            'siswa_sakit' => $sakit,
            'siswa_izin' => $izin,
            'siswa_alpha' => $alpha,
        ]);

    $updatedMengajar++;
}

echo "Updated {$updatedMengajar} absensi_mengajar records with siswa counts\n\n";

// ============ FINAL SUMMARY ============
echo str_repeat('=', 60) . "\n";
echo "IMPORT COMPLETE\n";
echo str_repeat('=', 60) . "\n";
$finalCount = DB::table('absensi_siswa')->count();
echo "Total absensi_siswa in DB now: {$finalCount}\n";
