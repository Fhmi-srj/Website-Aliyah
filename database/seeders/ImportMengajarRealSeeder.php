<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Carbon;

class ImportMengajarRealSeeder extends Seeder
{
    /**
     * Import all data from MENGAJAR REAL.xlsx into absensi_mengajar.
     * This uses a Node.js helper to parse the Excel and output JSON,
     * which is then processed by this seeder.
     */
    public function run(): void
    {
        // Step 1: Truncate existing data and reset auto increment
        $this->command->info('Truncating absensi_mengajar and absensi_siswa...');
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        DB::table('absensi_siswa')->truncate();
        DB::table('absensi_mengajar')->truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        // Drop unique constraint - MySQL needs a regular index on guru_id for FK first
        try {
            DB::statement('CREATE INDEX idx_guru_id ON absensi_mengajar (guru_id)');
        } catch (\Exception $e) {
            // Index may already exist
        }
        try {
            DB::statement('ALTER TABLE absensi_mengajar DROP INDEX unique_absensi_mengajar');
            $this->command->info('Dropped unique constraint: unique_absensi_mengajar');
        } catch (\Exception $e) {
            $this->command->warn('Could not drop unique constraint: ' . $e->getMessage());
        }

        $this->command->info('Tables truncated and auto increment reset.');

        // Step 2: Read Excel via Node.js helper
        $excelPath = base_path('MENGAJAR REAL.xlsx');
        if (!file_exists($excelPath)) {
            $this->command->error("File not found: {$excelPath}");
            return;
        }

        $this->command->info('Reading Excel file via Node.js...');

        $script = <<<'JS'
const XLSX = require('xlsx');
const path = process.argv[2];
const wb = XLSX.readFile(path);
const ws = wb.Sheets[wb.SheetNames[0]];
const range = XLSX.utils.decode_range(ws['!ref']);
const rows = [];
for (let r = 1; r <= range.e.r; r++) {
    const getVal = (c) => {
        const cell = ws[XLSX.utils.encode_cell({r, c})];
        return cell ? { t: cell.t, v: cell.v, w: cell.w || '' } : null;
    };
    const waktu = getVal(0);
    let timestamp = null;
    if (waktu) {
        if (waktu.t === 's') {
            // String format: "16/07/2025 10:01:33"
            timestamp = waktu.v;
        } else if (waktu.t === 'n') {
            // Excel serial date number - convert to JS Date
            const d = XLSX.SSF.parse_date_code(waktu.v);
            const pad = (n) => String(n).padStart(2, '0');
            timestamp = `${pad(d.d)}/${pad(d.m)}/${d.y} ${pad(d.H)}:${pad(d.M)}:${pad(d.S)}`;
        }
    }
    rows.push({
        waktu: timestamp,
        nama: getVal(1)?.v || '',
        mapel: getVal(2)?.v || '',
        jam_mulai: getVal(3)?.v || null,
        jam_selesai: getVal(4)?.v || null,
        ringkasan: getVal(5)?.v || '',
        kelas: getVal(6)?.v || '',
        berita_acara: getVal(7)?.v || ''
    });
}
process.stdout.write(JSON.stringify(rows));
JS;

        $tempScript = base_path('_import_helper.cjs');
        file_put_contents($tempScript, $script);

        $escapedPath = escapeshellarg($excelPath);
        $escapedScript = escapeshellarg($tempScript);
        $output = shell_exec("cd " . escapeshellarg(base_path()) . " && node {$escapedScript} {$escapedPath} 2>&1");
        @unlink($tempScript);

        if (!$output) {
            $this->command->error('Failed to read Excel file via Node.js');
            return;
        }

        $rows = json_decode($output, true);
        if (!$rows) {
            $this->command->error('Failed to parse Excel data. Output: ' . substr($output, 0, 500));
            return;
        }

        $this->command->info("Parsed " . count($rows) . " rows from Excel.");

        // Step 3: Build guru name -> ID mapping
        $guruMap = DB::table('guru')->pluck('id', 'nama')->toArray();

        // Also create fuzzy map for name variations in the Excel
        $nameAliases = [
            'Agus Amin' => 'Agus Amin, S.Ag',
            'Agus Amin, S.Ag.' => 'Agus Amin, S.Ag',
        ];

        // Step 4: Insert all records
        $this->command->info('Inserting records...');
        $inserted = 0;
        $skipped = 0;
        $batchData = [];

        foreach ($rows as $index => $row) {
            // Parse timestamp "dd/mm/yyyy HH:mm:ss"
            $tanggal = null;
            $absensiTime = null;

            if (!empty($row['waktu'])) {
                try {
                    $parsed = Carbon::createFromFormat('d/m/Y H:i:s', $row['waktu']);
                    $tanggal = $parsed->toDateString();
                    $absensiTime = $parsed->toDateTimeString();
                } catch (\Exception $e) {
                    // Try alternative format
                    try {
                        $parsed = Carbon::parse($row['waktu']);
                        $tanggal = $parsed->toDateString();
                        $absensiTime = $parsed->toDateTimeString();
                    } catch (\Exception $e2) {
                        $this->command->warn("Row " . ($index + 2) . ": Invalid timestamp '{$row['waktu']}'");
                    }
                }
            }

            if (!$tanggal) {
                $skipped++;
                continue;
            }

            // Resolve guru name
            $guruNama = trim($row['nama']);
            $resolvedName = $nameAliases[$guruNama] ?? $guruNama;
            $guruId = $guruMap[$resolvedName] ?? null;

            if (!$guruId) {
                // Try partial match
                foreach ($guruMap as $name => $id) {
                    if (stripos($name, explode(',', $guruNama)[0]) !== false) {
                        $guruId = $id;
                        break;
                    }
                }
            }

            // Build jam snapshot
            $jamMulai = $row['jam_mulai'];
            $jamSelesai = $row['jam_selesai'];
            $snapshotJam = null;
            if ($jamMulai !== null && $jamSelesai !== null) {
                $snapshotJam = "Jam ke-{$jamMulai} s/d {$jamSelesai}";
            } elseif ($jamMulai !== null) {
                $snapshotJam = "Jam ke-{$jamMulai}";
            }

            // Parse kelas name for snapshot
            $kelasRaw = trim($row['kelas']);

            // Parse hari from tanggal
            $snapshotHari = null;
            if ($tanggal) {
                $dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
                $snapshotHari = $dayNames[Carbon::parse($tanggal)->dayOfWeek];
            }

            $batchData[] = [
                'jadwal_id' => null,
                'guru_id' => $guruId,
                'snapshot_kelas' => $kelasRaw ?: null,
                'snapshot_mapel' => trim($row['mapel']) ?: null,
                'snapshot_jam' => $snapshotJam,
                'snapshot_hari' => $snapshotHari,
                'snapshot_guru_nama' => $guruNama,
                'tanggal' => $tanggal,
                'ringkasan_materi' => trim($row['ringkasan']) ?: null,
                'berita_acara' => trim($row['berita_acara']) ?: null,
                'status' => 'hadir',
                'guru_status' => 'H',
                'guru_keterangan' => null,
                'guru_tugas_id' => null,
                'tugas_siswa' => null,
                'absensi_time' => $absensiTime,
                'created_at' => $absensiTime ?? now(),
                'updated_at' => $absensiTime ?? now(),
            ];

            // Insert in batches of 100
            if (count($batchData) >= 100) {
                DB::table('absensi_mengajar')->insert($batchData);
                $inserted += count($batchData);
                $batchData = [];
                $this->command->info("  Inserted {$inserted} records...");
            }
        }

        // Insert remaining
        if (!empty($batchData)) {
            DB::table('absensi_mengajar')->insert($batchData);
            $inserted += count($batchData);
        }

        $this->command->info("✅ Import complete! {$inserted} records inserted, {$skipped} skipped.");
    }
}
