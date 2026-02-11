<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use App\Models\AbsensiMengajar;
use App\Models\AbsensiSiswa;
use App\Models\Guru;
use App\Models\Siswa;
use App\Models\Kelas;
use App\Models\Mapel;
use App\Models\Jadwal;
use App\Models\TahunAjaran;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class ImportAttendanceCommand extends Command
{
    protected $signature = 'import:attendance 
                            {--dry-run : Run without actually saving to database}
                            {--skip-siswa : Skip importing student attendance}';

    protected $description = 'Import attendance data from Excel files (MENGAJAR REAL.xlsx and ABSEN SISWA REAL.xlsx)';

    private $guruCache = [];
    private $siswaCache = [];
    private $kelasCache = [];
    private $mapelCache = [];
    private $tahunAjaranId;

    public function handle()
    {
        $dryRun = $this->option('dry-run');
        $skipSiswa = $this->option('skip-siswa');

        $this->info($dryRun ? '🔍 Running in DRY-RUN mode (no data will be saved)' : '📥 Running in LIVE mode');
        $this->newLine();

        // Get active tahun ajaran
        $tahunAjaran = TahunAjaran::where('is_active', true)->first();
        if (!$tahunAjaran) {
            $this->error('No active Tahun Ajaran found!');
            return 1;
        }
        $this->tahunAjaranId = $tahunAjaran->id;
        $this->info("Using Tahun Ajaran: {$tahunAjaran->nama}");

        // Build caches
        $this->buildCaches();

        // Import teaching attendance
        $mengajarResults = $this->importMengajar($dryRun);

        // Import student attendance
        $siswaResults = ['imported' => 0, 'skipped' => 0, 'errors' => 0];
        if (!$skipSiswa) {
            $siswaResults = $this->importSiswa($dryRun);
        }

        // Summary
        $this->newLine();
        $this->info('═══════════════════════════════════════');
        $this->info('📊 IMPORT SUMMARY');
        $this->info('═══════════════════════════════════════');
        $this->table(
            ['Type', 'Imported', 'Skipped', 'Errors'],
            [
                ['AbsensiMengajar', $mengajarResults['imported'], $mengajarResults['skipped'], $mengajarResults['errors']],
                ['AbsensiSiswa (non-hadir)', $siswaResults['imported'], $siswaResults['skipped'], $siswaResults['errors']],
            ]
        );

        if ($dryRun) {
            $this->warn('⚠️  This was a DRY-RUN. No data was actually saved.');
            $this->info('Run without --dry-run to perform actual import.');
        }

        return 0;
    }

    private function buildCaches()
    {
        $this->info('Building caches...');

        // Cache guru by name (lowercase for matching)
        Guru::all()->each(function ($guru) {
            $key = $this->normalizeName($guru->nama);
            $this->guruCache[$key] = $guru;
        });
        $this->info("  - Cached " . count($this->guruCache) . " guru");

        // Cache siswa by name
        Siswa::all()->each(function ($siswa) {
            $key = $this->normalizeName($siswa->nama);
            $this->siswaCache[$key] = $siswa;
        });
        $this->info("  - Cached " . count($this->siswaCache) . " siswa");

        // Cache kelas by nama - store multiple variants
        Kelas::all()->each(function ($kelas) {
            // Store by actual name
            $this->kelasCache[strtoupper($kelas->nama_kelas)] = $kelas;
            // Also store by roman numeral only
            if (preg_match('/^(X{1,3}|XII|XI|X)/i', $kelas->nama_kelas, $matches)) {
                $this->kelasCache[strtoupper($matches[1])] = $kelas;
            }
        });
        $this->info("  - Cached " . count($this->kelasCache) . " kelas variants");

        // Cache mapel by nama
        Mapel::all()->each(function ($mapel) {
            $key = $this->normalizeMapel($mapel->nama_mapel);
            $this->mapelCache[$key] = $mapel;
        });
        $this->info("  - Cached " . count($this->mapelCache) . " mapel");
    }

    private function importMengajar($dryRun)
    {
        $this->newLine();
        $this->info('📚 Importing Teaching Attendance (MENGAJAR REAL.xlsx)...');

        $filePath = base_path('MENGAJAR REAL.xlsx');
        if (!file_exists($filePath)) {
            $this->error("File not found: $filePath");
            return ['imported' => 0, 'skipped' => 0, 'errors' => 1];
        }

        $spreadsheet = IOFactory::load($filePath);
        $sheet = $spreadsheet->getActiveSheet();
        $highestRow = $sheet->getHighestRow();

        $imported = 0;
        $skipped = 0;
        $errors = 0;

        $bar = $this->output->createProgressBar($highestRow - 1);
        $bar->start();

        DB::beginTransaction();
        try {
            for ($row = 2; $row <= $highestRow; $row++) {
                $bar->advance();

                // Read row data
                $waktu = $sheet->getCell('A' . $row)->getValue();
                $namaGuru = $sheet->getCell('B' . $row)->getValue();
                $mapelName = $sheet->getCell('C' . $row)->getValue();
                $jamMulai = $sheet->getCell('D' . $row)->getValue();
                $jamSelesai = $sheet->getCell('E' . $row)->getValue();
                $ringkasanMateri = $sheet->getCell('F' . $row)->getValue();
                $kelasName = $sheet->getCell('G' . $row)->getValue();
                $beritaAcara = $sheet->getCell('H' . $row)->getValue();

                // Parse date
                $tanggal = $this->parseDate($waktu);
                if (!$tanggal) {
                    $this->newLine();
                    $this->warn("  Row $row: Invalid date format: $waktu");
                    $errors++;
                    continue;
                }

                // Find guru
                $guru = $this->findGuru($namaGuru);
                if (!$guru) {
                    $this->newLine();
                    $this->warn("  Row $row: Guru not found: $namaGuru");
                    $errors++;
                    continue;
                }

                // Find kelas
                $kelas = $this->findKelas($kelasName);
                if (!$kelas) {
                    $this->newLine();
                    $this->warn("  Row $row: Kelas not found: $kelasName");
                    $errors++;
                    continue;
                }

                // Find mapel
                $mapel = $this->findMapel($mapelName);
                $mapelNama = $mapel ? $mapel->nama_mapel : $mapelName;

                // Check for duplicate
                $existing = AbsensiMengajar::where('guru_id', $guru->id)
                    ->where('tanggal', $tanggal->toDateString())
                    ->where('snapshot_kelas', $kelas->nama_kelas)
                    ->where('snapshot_mapel', $mapelNama)
                    ->first();

                if ($existing) {
                    $skipped++;
                    continue;
                }

                // Try to find jadwal (optional)
                $jadwal = Jadwal::where('guru_id', $guru->id)
                    ->where('kelas_id', $kelas->id)
                    ->where('mapel_id', $mapel?->id)
                    ->first();

                if (!$dryRun) {
                    AbsensiMengajar::create([
                        'jadwal_id' => $jadwal?->id,
                        'guru_id' => $guru->id,
                        'snapshot_kelas' => $kelas->nama_kelas,
                        'snapshot_mapel' => $mapelNama,
                        'snapshot_jam' => "Jam ke-$jamMulai s/d $jamSelesai",
                        'snapshot_hari' => $tanggal->locale('id')->dayName,
                        'snapshot_guru_nama' => $guru->nama,
                        'tanggal' => $tanggal->toDateString(),
                        'ringkasan_materi' => $ringkasanMateri,
                        'berita_acara' => $beritaAcara,
                        'status' => 'hadir',
                        'guru_status' => 'H',
                        'absensi_time' => $this->parseDateTime($waktu),
                    ]);
                }

                $imported++;
            }

            if (!$dryRun) {
                DB::commit();
            } else {
                DB::rollBack();
            }
        } catch (\Exception $e) {
            DB::rollBack();
            $this->error("Error: " . $e->getMessage());
            $errors++;
        }

        $bar->finish();
        $this->newLine();

        return ['imported' => $imported, 'skipped' => $skipped, 'errors' => $errors];
    }

    private function importSiswa($dryRun)
    {
        $this->newLine();
        $this->info('👨‍🎓 Importing Student Attendance (ABSEN SISWA REAL.xlsx)...');

        $filePath = base_path('ABSEN SISWA REAL.xlsx');
        if (!file_exists($filePath)) {
            $this->error("File not found: $filePath");
            return ['imported' => 0, 'skipped' => 0, 'errors' => 0];
        }

        $spreadsheet = IOFactory::load($filePath);
        $sheet = $spreadsheet->getActiveSheet();
        $highestRow = $sheet->getHighestRow();

        // Status priority: A > S > I > H (lower number = higher priority)
        $statusPriority = ['A' => 1, 'S' => 2, 'I' => 3, 'H' => 4];

        // First pass: collect all student attendance by date + kelas + siswa
        // Keep only the highest priority status per day
        $this->info('  Pass 1: Collecting student attendance data...');
        $studentAttendance = []; // [date][kelas][siswa_id] => ['status' => X, 'keterangan' => Y]

        for ($row = 2; $row <= $highestRow; $row++) {
            $waktu = $sheet->getCell('A' . $row)->getValue();
            $namaSiswa = $sheet->getCell('B' . $row)->getValue();
            $kelasName = $sheet->getCell('C' . $row)->getValue();
            $statusRaw = $sheet->getCell('D' . $row)->getValue();
            $keterangan = $sheet->getCell('E' . $row)->getValue();

            $tanggal = $this->parseDate($waktu);
            if (!$tanggal)
                continue;

            $siswa = $this->findSiswa($namaSiswa);
            if (!$siswa)
                continue; // Skip missing students silently

            $kelas = $this->findKelas($kelasName);
            if (!$kelas)
                continue;

            $status = $this->mapSiswaStatus($statusRaw);
            $dateStr = $tanggal->toDateString();
            $kelasKey = $kelas->nama_kelas;
            $siswaId = $siswa->id;

            // Initialize if not exists
            if (!isset($studentAttendance[$dateStr][$kelasKey][$siswaId])) {
                $studentAttendance[$dateStr][$kelasKey][$siswaId] = [
                    'status' => $status,
                    'keterangan' => $keterangan,
                ];
            } else {
                // Keep higher priority status (A > S > I > H)
                $existingPriority = $statusPriority[$studentAttendance[$dateStr][$kelasKey][$siswaId]['status']] ?? 4;
                $newPriority = $statusPriority[$status] ?? 4;
                if ($newPriority < $existingPriority) {
                    $studentAttendance[$dateStr][$kelasKey][$siswaId] = [
                        'status' => $status,
                        'keterangan' => $keterangan,
                    ];
                }
            }
        }

        // Second pass: apply to all AbsensiMengajar records
        $this->info('  Pass 2: Applying to all AbsensiMengajar records...');
        $imported = 0;
        $skipped = 0;

        DB::beginTransaction();
        try {
            foreach ($studentAttendance as $dateStr => $kelasData) {
                foreach ($kelasData as $kelasName => $siswaData) {
                    // Get ALL AbsensiMengajar for this date and kelas
                    $absensiMengajarList = AbsensiMengajar::where('tanggal', $dateStr)
                        ->where('snapshot_kelas', $kelasName)
                        ->get();

                    if ($absensiMengajarList->isEmpty()) {
                        $skipped += count($siswaData);
                        continue;
                    }

                    foreach ($siswaData as $siswaId => $data) {
                        foreach ($absensiMengajarList as $absensiMengajar) {
                            // Check for existing
                            $existing = AbsensiSiswa::where('absensi_mengajar_id', $absensiMengajar->id)
                                ->where('siswa_id', $siswaId)
                                ->first();

                            if ($existing) {
                                // Update if new status has higher priority
                                $existingPriority = $statusPriority[$existing->status] ?? 4;
                                $newPriority = $statusPriority[$data['status']] ?? 4;
                                if ($newPriority < $existingPriority && !$dryRun) {
                                    $existing->update([
                                        'status' => $data['status'],
                                        'keterangan' => $data['keterangan'],
                                    ]);
                                    $imported++;
                                } else {
                                    $skipped++;
                                }
                                continue;
                            }

                            if (!$dryRun) {
                                AbsensiSiswa::create([
                                    'absensi_mengajar_id' => $absensiMengajar->id,
                                    'siswa_id' => $siswaId,
                                    'status' => $data['status'],
                                    'keterangan' => $data['keterangan'],
                                ]);
                            }
                            $imported++;
                        }
                    }
                }
            }

            if (!$dryRun) {
                DB::commit();
            } else {
                DB::rollBack();
            }
        } catch (\Exception $e) {
            DB::rollBack();
            $this->error("Error: " . $e->getMessage());
        }

        $this->info("  ✓ Processed " . count($studentAttendance) . " unique dates");

        return ['imported' => $imported, 'skipped' => $skipped, 'errors' => 0];
    }

    // Helper methods
    private function normalizeName($name)
    {
        return strtolower(trim(preg_replace('/\s+/', ' ', $name)));
    }

    private function normalizeKelas($kelas)
    {
        // "X ( Sepuluh )" -> "X"
        // "X" -> "X"
        $kelas = trim($kelas);
        if (preg_match('/^(X{1,3}|XII|XI|X)/i', $kelas, $matches)) {
            return strtoupper($matches[1]);
        }
        return strtoupper($kelas);
    }

    private function normalizeMapel($mapel)
    {
        return strtolower(trim($mapel));
    }

    private function findGuru($name)
    {
        $key = $this->normalizeName($name);

        // Exact match first
        if (isset($this->guruCache[$key])) {
            return $this->guruCache[$key];
        }

        // Partial match
        foreach ($this->guruCache as $cacheKey => $guru) {
            if (str_contains($key, $cacheKey) || str_contains($cacheKey, $key)) {
                return $guru;
            }
            // Try without titles like S.Pd, M.Pd, etc
            $cleanKey = preg_replace('/,?\s*(s\.pd|m\.pd|s\.ag|m\.ag|lc|s\.e|m\.m)\.?$/i', '', $key);
            $cleanCacheKey = preg_replace('/,?\s*(s\.pd|m\.pd|s\.ag|m\.ag|lc|s\.e|m\.m)\.?$/i', '', $cacheKey);
            if (trim($cleanKey) === trim($cleanCacheKey)) {
                return $guru;
            }
        }

        return null;
    }

    private function findSiswa($name)
    {
        $key = $this->normalizeName($name);

        if (isset($this->siswaCache[$key])) {
            return $this->siswaCache[$key];
        }

        // Partial match
        foreach ($this->siswaCache as $cacheKey => $siswa) {
            if ($key === $cacheKey || str_contains($key, $cacheKey) || str_contains($cacheKey, $key)) {
                return $siswa;
            }
        }

        return null;
    }

    private function findKelas($name)
    {
        $key = $this->normalizeKelas($name);

        if (isset($this->kelasCache[$key])) {
            return $this->kelasCache[$key];
        }

        // Try variations
        foreach ($this->kelasCache as $cacheKey => $kelas) {
            if (str_contains($cacheKey, $key) || str_contains($key, $cacheKey)) {
                return $kelas;
            }
        }

        return null;
    }

    private function findMapel($name)
    {
        $key = $this->normalizeMapel($name);

        if (isset($this->mapelCache[$key])) {
            return $this->mapelCache[$key];
        }

        // Partial match
        foreach ($this->mapelCache as $cacheKey => $mapel) {
            if (str_contains($key, $cacheKey) || str_contains($cacheKey, $key)) {
                return $mapel;
            }
        }

        return null;
    }

    private function parseDate($waktu)
    {
        if (!$waktu)
            return null;

        try {
            // Format: "16/07/2025 10:01:33"
            if (preg_match('/(\d{2})\/(\d{2})\/(\d{4})/', $waktu, $matches)) {
                return Carbon::createFromFormat('d/m/Y', "{$matches[1]}/{$matches[2]}/{$matches[3]}");
            }
            return Carbon::parse($waktu);
        } catch (\Exception $e) {
            return null;
        }
    }

    private function parseDateTime($waktu)
    {
        if (!$waktu)
            return null;

        try {
            // Format: "16/07/2025 10:01:33"
            if (preg_match('/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})/', $waktu, $matches)) {
                return Carbon::createFromFormat(
                    'd/m/Y H:i:s',
                    "{$matches[1]}/{$matches[2]}/{$matches[3]} {$matches[4]}:{$matches[5]}:{$matches[6]}"
                );
            }
            return Carbon::parse($waktu);
        } catch (\Exception $e) {
            return now();
        }
    }

    private function mapSiswaStatus($status)
    {
        $status = strtoupper(trim($status));
        return match ($status) {
            'ALPA', 'ALPHA', 'A' => 'A',
            'SAKIT', 'S' => 'S',
            'IZIN', 'I' => 'I',
            'HADIR', 'H' => 'H',
            default => 'A',
        };
    }
}
