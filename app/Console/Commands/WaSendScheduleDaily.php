<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Jadwal;
use App\Models\TahunAjaran;
use App\Services\WhatsappService;
use Illuminate\Support\Carbon;

class WaSendScheduleDaily extends Command
{
    protected $signature = 'wa:schedule-daily {--dry-run : Preview tanpa kirim}';
    protected $description = 'Kirim jadwal mengajar harian ke grup WA (dikelompokkan per kelas)';

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

        $daftarJadwal = '';
        foreach ($grouped as $kelasId => $jadwals) {
            $kelas = $jadwals->first()->kelas;
            $kelasNama = $kelas->nama_kelas ?? '-';

            $daftarJadwal .= "*{$kelasNama}*\n\n";

            foreach ($jadwals as $jadwal) {
                $jam = substr($jadwal->jam_mulai, 0, 5);
                $guru = $jadwal->guru->nama ?? '-';
                $mapel = $jadwal->mapel->nama ?? '-';
                $daftarJadwal .= "{$jam} | {$guru} | {$mapel}\n";
            }

            $daftarJadwal .= "\n";
        }

        $message = $wa->renderTemplate('jadwal_harian', [
            'hari' => $hariIni,
            'tanggal' => $now->translatedFormat('d F Y'),
            'daftar_jadwal' => trim($daftarJadwal),
        ]);

        if ($dryRun) {
            $this->info("=== DRY RUN - Jadwal Harian ===");
            $this->line($message);
        } else {
            $result = $wa->sendToGroup($message);
            $this->info($result['success'] ? 'Jadwal harian terkirim ke grup' : 'Gagal: ' . $result['message']);
        }

        return Command::SUCCESS;
    }
}
