<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Jadwal;
use App\Models\AbsensiMengajar;
use App\Models\TahunAjaran;
use App\Services\WhatsappService;
use Illuminate\Support\Carbon;

class WaSendAttendanceRecap extends Command
{
    protected $signature = 'wa:attendance-recap {--dry-run : Preview tanpa kirim}';
    protected $description = 'Kirim rekap absensi mengajar hari ini ke grup WA (dikelompokkan per kelas)';

    protected $dayNames = [
        Carbon::MONDAY => 'Senin',
        Carbon::TUESDAY => 'Selasa',
        Carbon::WEDNESDAY => 'Rabu',
        Carbon::THURSDAY => 'Kamis',
        Carbon::FRIDAY => 'Jumat',
        Carbon::SATURDAY => 'Sabtu',
        Carbon::SUNDAY => 'Minggu',
    ];

    public function handle()
    {
        $wa = new WhatsappService();
        $dryRun = $this->option('dry-run');
        $now = Carbon::now();
        $today = $now->format('Y-m-d');
        $hariIni = $this->dayNames[$now->dayOfWeek] ?? null;

        if (!$hariIni || $now->dayOfWeek === Carbon::SUNDAY) {
            $this->info('Tidak ada jadwal hari Minggu');
            return Command::SUCCESS;
        }

        $tahunAjaran = TahunAjaran::where('is_active', true)->first();

        $jadwalList = Jadwal::with(['guru', 'mapel', 'kelas'])
            ->where('status', 'aktif')
            ->where('hari', $hariIni)
            ->when($tahunAjaran, fn($q) => $q->where('tahun_ajaran_id', $tahunAjaran->id))
            ->orderBy('jam_mulai')
            ->get();

        if ($jadwalList->isEmpty()) {
            $this->info('Tidak ada jadwal hari ini');
            return Command::SUCCESS;
        }

        // Group by kelas
        $grouped = $jadwalList->groupBy(fn($j) => $j->kelas_id);

        $daftarRekap = '';
        foreach ($grouped as $kelasId => $jadwals) {
            $kelas = $jadwals->first()->kelas;
            $kelasNama = $kelas->nama_kelas ?? '-';

            $daftarRekap .= "*{$kelasNama}*\n\n";

            // Track siswa totals for this kelas
            $totalSiswaH = 0;
            $totalSiswaI = 0;
            $totalSiswaS = 0;
            $totalSiswaA = 0;

            foreach ($jadwals as $jadwal) {
                $jam = substr($jadwal->jam_mulai, 0, 5);
                $guru = $jadwal->guru->nama ?? '-';
                $mapel = $jadwal->mapel->nama ?? '-';

                // Check attendance
                $absensi = AbsensiMengajar::where('jadwal_id', $jadwal->id)
                    ->whereDate('tanggal', $today)
                    ->first();

                $statusIcon = ($absensi && $absensi->absensi_time) ? '✅' : '❌';

                $daftarRekap .= "{$jam} | {$guru} | {$mapel} | {$statusIcon}\n";

                // Accumulate siswa attendance
                if ($absensi) {
                    $totalSiswaH += (int) ($absensi->siswa_hadir ?? 0);
                    $totalSiswaI += (int) ($absensi->siswa_izin ?? 0);
                    $totalSiswaS += (int) ($absensi->siswa_sakit ?? 0);
                    $totalSiswaA += (int) ($absensi->siswa_alpha ?? 0);
                }
            }

            // Add line separator and siswa summary
            $daftarRekap .= " | \n";
            $daftarRekap .= "Siswa = H = {$totalSiswaH} | I = {$totalSiswaI} | S = {$totalSiswaS} | A = {$totalSiswaA}\n\n";
        }

        $message = $wa->renderTemplate('rekap_absensi', [
            'hari' => $hariIni,
            'tanggal' => $now->translatedFormat('d F Y'),
            'daftar_rekap' => trim($daftarRekap),
        ]);

        if ($dryRun) {
            $this->info("=== DRY RUN - Rekap Absensi ===");
            $this->line($message);
        } else {
            $result = $wa->sendToGroup($message);
            $this->info($result['success'] ? 'Rekap absensi terkirim ke grup' : 'Gagal: ' . $result['message']);
        }

        return Command::SUCCESS;
    }
}
