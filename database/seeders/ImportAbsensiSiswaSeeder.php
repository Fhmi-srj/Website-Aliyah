<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Carbon;

class ImportAbsensiSiswaSeeder extends Seeder
{
    /**
     * Import student attendance from ABSEN SISWA REAL.xlsx into absensi_siswa.
     *
     * Logic:
     * - Excel records only non-hadir (ALPA/SAKIT/IZIN) per day
     * - For each absensi_mengajar record, create absensi_siswa for ALL students in the kelas
     * - Students with Excel records on that date get their status (S/I/A)
     * - Students without records get status 'H' (Hadir)
     */
    public function run(): void
    {
        // Step 1: Truncate existing absensi_siswa
        $this->command->info('Truncating absensi_siswa...');
        DB::table('absensi_siswa')->truncate();

        // Step 2: Add missing students to DB
        $this->command->info('Adding missing students...');
        $missingSiswa = [
            ['nama' => 'MUHAMMAD LUTFI AKMAL', 'kelas_id' => 43, 'status' => 'Aktif', 'nis' => 'TMP001', 'jenis_kelamin' => 'L'],
            ['nama' => 'SALSABILA SUFIANI', 'kelas_id' => 43, 'status' => 'Aktif', 'nis' => 'TMP002', 'jenis_kelamin' => 'P'],
            ['nama' => 'WULAN FITRI NAZNINNAIRA ISMANTO', 'kelas_id' => 45, 'status' => 'Aktif', 'nis' => 'TMP003', 'jenis_kelamin' => 'P'],
        ];
        foreach ($missingSiswa as $s) {
            $exists = DB::table('siswa')->where('nama', $s['nama'])->exists();
            if (!$exists) {
                DB::table('siswa')->insert([
                    'nama' => $s['nama'],
                    'nis' => $s['nis'],
                    'kelas_id' => $s['kelas_id'],
                    'jenis_kelamin' => $s['jenis_kelamin'],
                    'status' => $s['status'],
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                $this->command->info("  Added: {$s['nama']}");
            } else {
                $this->command->info("  Already exists: {$s['nama']}");
            }
        }

        // Step 3: Load siswa grouped by kelas
        $siswaByKelas = [];
        $siswaNameMap = []; // nama => id
        $allSiswa = DB::table('siswa')->select('id', 'nama', 'kelas_id')->get();
        foreach ($allSiswa as $s) {
            $siswaByKelas[$s->kelas_id][] = $s;
            $siswaNameMap[strtoupper(trim($s->nama))] = $s->id;
        }
        $this->command->info('Loaded ' . $allSiswa->count() . ' students across ' . count($siswaByKelas) . ' classes.');

        // Step 4: Read Excel via Node.js
        $excelPath = base_path('ABSEN SISWA REAL.xlsx');
        if (!file_exists($excelPath)) {
            $this->command->error("File not found: {$excelPath}");
            return;
        }

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
        return cell ? { t: cell.t, v: cell.v } : null;
    };
    const waktu = getVal(0);
    let dateStr = null;
    if (waktu) {
        if (waktu.t === 's') {
            dateStr = waktu.v.split(' ')[0]; // "16/07/2025"
        } else if (waktu.t === 'n') {
            const d = XLSX.SSF.parse_date_code(waktu.v);
            const pad = (n) => String(n).padStart(2, '0');
            dateStr = `${pad(d.d)}/${pad(d.m)}/${d.y}`;
        }
    }
    rows.push({
        date: dateStr,
        nama: (getVal(1)?.v || '').toString().trim().toUpperCase(),
        kelas: (getVal(2)?.v || '').toString().trim(),
        status: (getVal(3)?.v || '').toString().trim().toUpperCase(),
        keterangan: (getVal(4)?.v || '').toString().trim()
    });
}
process.stdout.write(JSON.stringify(rows));
JS;

        $tempScript = base_path('_import_siswa_helper.cjs');
        file_put_contents($tempScript, $script);
        $output = shell_exec("cd " . escapeshellarg(base_path()) . " && node " . escapeshellarg($tempScript) . " " . escapeshellarg($excelPath) . " 2>&1");
        @unlink($tempScript);

        $excelRows = json_decode($output, true);
        if (!$excelRows) {
            $this->command->error('Failed to parse Excel. Output: ' . substr($output ?? '', 0, 500));
            return;
        }
        $this->command->info('Parsed ' . count($excelRows) . ' rows from Excel.');

        // Step 5: Build absence map: "YYYY-MM-DD_NAMA" => {status, keterangan}
        $statusMap = [
            'ALPA' => 'A',
            'SAKIT' => 'S',
            'IZIN' => 'I',
        ];

        $absenceMap = []; // key: "date_nama" => ['status' => 'A/S/I', 'keterangan' => '...']
        $unmappedNames = [];

        foreach ($excelRows as $row) {
            if (empty($row['date']) || empty($row['nama']) || empty($row['status']))
                continue;

            // Parse date dd/mm/yyyy -> YYYY-MM-DD
            $parts = explode('/', $row['date']);
            if (count($parts) !== 3)
                continue;
            $dateKey = "{$parts[2]}-{$parts[1]}-{$parts[0]}"; // YYYY-MM-DD

            $nama = strtoupper(trim($row['nama']));
            $status = $statusMap[$row['status']] ?? null;
            if (!$status)
                continue;

            // Check siswa exists
            if (!isset($siswaNameMap[$nama])) {
                $unmappedNames[$nama] = true;
                continue;
            }

            $key = "{$dateKey}_{$nama}";
            // Keep last occurrence (in case of duplicates on same day)
            $absenceMap[$key] = [
                'status' => $status,
                'keterangan' => $row['keterangan'] ?: null,
            ];
        }

        if (!empty($unmappedNames)) {
            $this->command->warn('Unmapped student names:');
            foreach (array_keys($unmappedNames) as $name) {
                $this->command->warn("  - {$name}");
            }
        }

        $this->command->info('Built absence map with ' . count($absenceMap) . ' entries.');

        // Step 6: Load all absensi_mengajar with kelas info
        $kelasNameToId = ['X' => 43, 'XI' => 44, 'XII' => 45];
        $kelasAliases = [
            'X ( Sepuluh )' => 43,
            'XI ( Sebelas )' => 44,
            'XII ( Duabelas )' => 45,
            'X' => 43,
            'XI' => 44,
            'XII' => 45,
        ];

        $absensiMengajar = DB::table('absensi_mengajar')
            ->select('id', 'tanggal', 'snapshot_kelas', 'jadwal_id')
            ->get();

        $this->command->info('Processing ' . $absensiMengajar->count() . ' absensi_mengajar records...');

        // Step 7: For each absensi_mengajar, create absensi_siswa for all students
        $totalInserted = 0;
        $totalHadir = 0;
        $totalAbsent = 0;
        $batchData = [];

        foreach ($absensiMengajar as $am) {
            // Determine kelas_id
            $kelasId = $kelasAliases[$am->snapshot_kelas] ?? null;

            // Fallback: get from jadwal
            if (!$kelasId && $am->jadwal_id) {
                $jadwal = DB::table('jadwal')->where('id', $am->jadwal_id)->first();
                if ($jadwal)
                    $kelasId = $jadwal->kelas_id;
            }

            if (!$kelasId || !isset($siswaByKelas[$kelasId])) {
                continue;
            }

            $tanggal = Carbon::parse($am->tanggal)->format('Y-m-d');
            $students = $siswaByKelas[$kelasId];

            foreach ($students as $siswa) {
                $nama = strtoupper(trim($siswa->nama));
                $key = "{$tanggal}_{$nama}";

                if (isset($absenceMap[$key])) {
                    // Student was absent
                    $status = $absenceMap[$key]['status'];
                    $keterangan = $absenceMap[$key]['keterangan'];
                    $totalAbsent++;
                } else {
                    // Student was present
                    $status = 'H';
                    $keterangan = null;
                    $totalHadir++;
                }

                $batchData[] = [
                    'absensi_mengajar_id' => $am->id,
                    'siswa_id' => $siswa->id,
                    'status' => $status,
                    'keterangan' => $keterangan,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];

                // Insert in batches of 500
                if (count($batchData) >= 500) {
                    DB::table('absensi_siswa')->insert($batchData);
                    $totalInserted += count($batchData);
                    $batchData = [];

                    if ($totalInserted % 2000 === 0) {
                        $this->command->info("  Inserted {$totalInserted} records...");
                    }
                }
            }
        }

        // Insert remaining
        if (!empty($batchData)) {
            DB::table('absensi_siswa')->insert($batchData);
            $totalInserted += count($batchData);
        }

        $this->command->info('');
        $this->command->info("✅ Import complete!");
        $this->command->info("   Total absensi_siswa records: {$totalInserted}");
        $this->command->info("   Hadir (H): {$totalHadir}");
        $this->command->info("   Absent (S/I/A): {$totalAbsent}");
    }
}
