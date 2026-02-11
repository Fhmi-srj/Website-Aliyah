<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Jadwal;
use App\Models\Kegiatan;
use App\Models\Rapat;
use App\Models\AbsensiMengajar;
use App\Models\AbsensiKegiatan;
use App\Models\AbsensiRapat;
use Illuminate\Support\Carbon;

class AutoSaveAlphaRecords extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'absensi:save-alpha {--days=30 : Number of days threshold for alpha}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Automatically save Alpha (missed) attendance records to database after specified days';

    /**
     * Day name to Carbon day number mapping
     */
    protected $dayMap = [
        'Senin' => Carbon::MONDAY,
        'Selasa' => Carbon::TUESDAY,
        'Rabu' => Carbon::WEDNESDAY,
        'Kamis' => Carbon::THURSDAY,
        'Jumat' => Carbon::FRIDAY,
        'Sabtu' => Carbon::SATURDAY,
        'Minggu' => Carbon::SUNDAY,
    ];

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $daysThreshold = (int) $this->option('days');
        $cutoffDate = Carbon::now()->subDays($daysThreshold)->startOfDay();
        $today = Carbon::now();

        $this->info("Auto-saving Alpha records for items older than {$daysThreshold} days...");
        $this->info("Cutoff date: {$cutoffDate->format('Y-m-d')}");
        $this->newLine();

        // Process Mengajar
        $mengajarSaved = $this->processMengajar($cutoffDate, $today);

        // Process Kegiatan
        $kegiatanSaved = $this->processKegiatan($cutoffDate, $today);

        // Process Rapat
        $rapatSaved = $this->processRapat($cutoffDate, $today);

        $this->newLine();
        $this->info("=== Summary ===");
        $this->info("  - Mengajar: {$mengajarSaved} Alpha records saved");
        $this->info("  - Kegiatan: {$kegiatanSaved} Alpha records saved");
        $this->info("  - Rapat   : {$rapatSaved} Alpha records saved");

        return Command::SUCCESS;
    }

    /**
     * Process jadwal mengajar and save Alpha records
     */
    protected function processMengajar($cutoffDate, $today)
    {
        $this->info("[MENGAJAR] Processing...");

        $jadwalList = Jadwal::with(['guru', 'mapel', 'kelas'])
            ->where('status', 'aktif')
            ->get();

        $savedCount = 0;
        $sixtyDaysAgo = Carbon::now()->subDays(60)->startOfDay();

        foreach ($jadwalList as $jadwal) {
            $dayNumber = $this->dayMap[$jadwal->hari] ?? null;
            if ($dayNumber === null)
                continue;
            if (!$jadwal->guru_id)
                continue;

            $checkDate = $sixtyDaysAgo->copy();
            while ($checkDate->dayOfWeek !== $dayNumber) {
                $checkDate->addDay();
            }

            while ($checkDate->lte($cutoffDate)) {
                $endTime = Carbon::parse($checkDate->format('Y-m-d') . ' ' . $jadwal->jam_selesai);
                if ($endTime->gt($today)) {
                    $checkDate->addWeek();
                    continue;
                }

                $existingAbsensi = AbsensiMengajar::where('jadwal_id', $jadwal->id)
                    ->whereDate('tanggal', $checkDate->format('Y-m-d'))
                    ->first();

                if (!$existingAbsensi) {
                    AbsensiMengajar::create([
                        'jadwal_id' => $jadwal->id,
                        'guru_id' => $jadwal->guru_id,
                        'tanggal' => $checkDate->format('Y-m-d'),
                        'ringkasan_materi' => null,
                        'berita_acara' => null,
                        'status' => 'hadir',
                        'guru_status' => 'A',
                        'guru_keterangan' => 'Otomatis dicatat sebagai Alpha (tidak melakukan absensi)',
                        'absensi_time' => $endTime,
                    ]);
                    $savedCount++;
                }

                $checkDate->addWeek();
            }
        }

        $this->line("  - Saved: {$savedCount} records");
        return $savedCount;
    }

    /**
     * Process kegiatan and save Alpha records for PJ and Pendamping
     */
    protected function processKegiatan($cutoffDate, $today)
    {
        $this->info("[KEGIATAN] Processing...");

        // Get kegiatan that have ended before cutoff date and have no absensi record
        $kegiatanList = Kegiatan::with(['penanggungJawab'])
            ->where('status', 'aktif')
            ->whereNotNull('waktu_mulai')
            ->where('waktu_berakhir', '<', $cutoffDate)
            ->get();

        $savedCount = 0;

        foreach ($kegiatanList as $kegiatan) {
            $tanggal = Carbon::parse($kegiatan->waktu_mulai)->format('Y-m-d');

            // Check if absensi record exists
            $existingAbsensi = AbsensiKegiatan::where('kegiatan_id', $kegiatan->id)
                ->whereDate('tanggal', $tanggal)
                ->first();

            if (!$existingAbsensi) {
                // Build absensi_pendamping array with all pendamping as Alpha
                $absensiPendamping = [];
                $guruPendamping = $kegiatan->guru_pendamping ?? [];
                if (is_array($guruPendamping)) {
                    foreach ($guruPendamping as $guruId) {
                        $absensiPendamping[] = [
                            'guru_id' => (int) $guruId,
                            'status' => 'A',
                            'keterangan' => 'Otomatis dicatat sebagai Alpha',
                        ];
                    }
                }

                AbsensiKegiatan::create([
                    'kegiatan_id' => $kegiatan->id,
                    'tanggal' => $tanggal,
                    'penanggung_jawab_id' => $kegiatan->penanggung_jawab_id,
                    'pj_status' => 'A',
                    'pj_keterangan' => 'Otomatis dicatat sebagai Alpha (tidak melakukan absensi)',
                    'absensi_pendamping' => $absensiPendamping,
                    'absensi_siswa' => null,
                    'berita_acara' => null,
                    'status' => 'submitted',
                ]);
                $savedCount++;

                $this->line("  - Kegiatan: {$kegiatan->nama_kegiatan} ({$tanggal})");
            }
        }

        $this->line("  - Saved: {$savedCount} records");
        return $savedCount;
    }

    /**
     * Process rapat and save Alpha records for Pimpinan, Sekretaris, and Peserta
     */
    protected function processRapat($cutoffDate, $today)
    {
        $this->info("[RAPAT] Processing...");

        // Get rapat that have ended before cutoff date
        $rapatList = Rapat::where('status', 'aktif')
            ->whereNotNull('tanggal')
            ->where('tanggal', '<', $cutoffDate)
            ->get();

        $savedCount = 0;

        foreach ($rapatList as $rapat) {
            $tanggal = Carbon::parse($rapat->tanggal)->format('Y-m-d');

            // Check end time has passed
            $endTimeStr = $tanggal . ' ' . substr($rapat->waktu_selesai, 0, 8);
            $endTime = Carbon::parse($endTimeStr);

            if ($endTime->gt($today)) {
                continue;
            }

            // Check if absensi record exists
            $existingAbsensi = AbsensiRapat::where('rapat_id', $rapat->id)
                ->whereDate('tanggal', $tanggal)
                ->first();

            if (!$existingAbsensi) {
                // Build absensi_peserta array with all peserta as Alpha
                $absensiPeserta = [];
                $pesertaRapat = $rapat->peserta_rapat ?? [];
                if (is_array($pesertaRapat)) {
                    foreach ($pesertaRapat as $guruId) {
                        $absensiPeserta[] = [
                            'guru_id' => (int) $guruId,
                            'status' => 'A',
                            'keterangan' => 'Otomatis dicatat sebagai Alpha',
                            'self_attended' => false,
                            'attended_at' => null,
                        ];
                    }
                }

                AbsensiRapat::create([
                    'rapat_id' => $rapat->id,
                    'tanggal' => $tanggal,
                    'pimpinan_status' => 'A',
                    'pimpinan_keterangan' => 'Otomatis dicatat sebagai Alpha',
                    'pimpinan_self_attended' => false,
                    'pimpinan_attended_at' => null,
                    'sekretaris_status' => 'A',
                    'sekretaris_keterangan' => 'Otomatis dicatat sebagai Alpha',
                    'absensi_peserta' => $absensiPeserta,
                    'notulensi' => null,
                    'status' => 'submitted',
                ]);
                $savedCount++;

                $this->line("  - Rapat: {$rapat->agenda_rapat} ({$tanggal})");
            }
        }

        $this->line("  - Saved: {$savedCount} records");
        return $savedCount;
    }
}
