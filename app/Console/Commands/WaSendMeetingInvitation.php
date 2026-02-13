<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Rapat;
use App\Models\Guru;
use App\Models\AppSetting;
use App\Services\WhatsappService;
use Illuminate\Support\Carbon;

class WaSendMeetingInvitation extends Command
{
    protected $signature = 'wa:meeting-invitation {--dry-run : Preview tanpa kirim}';
    protected $description = 'Kirim undangan rapat H-2 dan pengingat hari H ke grup WA';

    public function handle()
    {
        $wa = new WhatsappService();
        $dryRun = $this->option('dry-run');
        $today = Carbon::now();
        $sent = 0;

        // Get kepala madrasah name from settings or fallback
        $kepalaMadrasah = AppSetting::getValue('nama_kepala_madrasah', 'Kepala MA Alhikam');

        // 1. Undangan Rapat H-2
        $h2Date = $today->copy()->addDays(2)->format('Y-m-d');
        $rapatH2 = Rapat::with(['pimpinanGuru', 'sekretarisGuru'])
            ->where('status', 'aktif')
            ->whereDate('tanggal', $h2Date)
            ->get();

        foreach ($rapatH2 as $rapat) {
            $pimpinanNama = $rapat->pimpinanGuru->nama ?? $rapat->pimpinan ?? '-';
            $sekretarisNama = $rapat->sekretarisGuru->nama ?? $rapat->sekretaris ?? '-';

            $message = $wa->renderTemplate('undangan_rapat', [
                'agenda' => $rapat->agenda_rapat,
                'tempat' => $rapat->tempat ?? '-',
                'tanggal' => Carbon::parse($rapat->tanggal)->translatedFormat('l, d F Y'),
                'waktu' => substr($rapat->waktu_mulai, 0, 5),
                'pimpinan' => $pimpinanNama,
                'sekretaris' => $sekretarisNama,
                'kepala_madrasah' => $kepalaMadrasah,
            ]);

            if ($dryRun) {
                $this->info("=== DRY RUN - Undangan Rapat H-2 ===");
                $this->line($message);
            } else {
                $wa->sendToGroup($message);
                usleep(1000000);
            }
            $sent++;
        }

        // 2. Pengingat Rapat Hari H
        $rapatHariH = Rapat::with(['pimpinanGuru', 'sekretarisGuru'])
            ->where('status', 'aktif')
            ->whereDate('tanggal', $today->format('Y-m-d'))
            ->get();

        foreach ($rapatHariH as $rapat) {
            $pimpinanNama = $rapat->pimpinanGuru->nama ?? $rapat->pimpinan ?? '-';
            $sekretarisNama = $rapat->sekretarisGuru->nama ?? $rapat->sekretaris ?? '-';

            $message = $wa->renderTemplate('pengingat_rapat', [
                'agenda' => $rapat->agenda_rapat,
                'tempat' => $rapat->tempat ?? '-',
                'waktu' => substr($rapat->waktu_mulai, 0, 5),
                'pimpinan' => $pimpinanNama,
                'sekretaris' => $sekretarisNama,
            ]);

            if ($dryRun) {
                $this->info("=== DRY RUN - Pengingat Rapat Hari H ===");
                $this->line($message);
            } else {
                $wa->sendToGroup($message);
                usleep(1000000);
            }
            $sent++;
        }

        $this->info("Total notifikasi rapat terkirim: {$sent}");
        return Command::SUCCESS;
    }
}
