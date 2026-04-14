<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Rapat;
use App\Models\Kegiatan;
use App\Models\KegiatanRutin;
use App\Models\Guru;
use App\Models\AppSetting;
use App\Services\WhatsappService;
use Illuminate\Support\Carbon;

class WaSendMeetingInvitation extends Command
{
    protected $signature = 'wa:meeting-invitation {--dry-run : Preview tanpa kirim}';
    protected $description = 'Kirim undangan rapat & kegiatan H-2 dan pengingat hari H ke grup WA';

    public function handle()
    {
        $wa = new WhatsappService();
        $dryRun = $this->option('dry-run');
        $today = Carbon::now();
        $sent = 0;

        // Get kepala madrasah name from settings or fallback
        $kepalaMadrasah = AppSetting::getValue('nama_kepala_madrasah', 'Kepala MA Alhikam');

        // ========================================
        // 1. RAPAT
        // ========================================

        // 1a. Undangan Rapat H-2
        $h2Date = $today->copy()->addDays(2)->format('Y-m-d');
        $rapatH2 = Rapat::with(['pimpinanGuru', 'sekretarisGuru'])
            ->whereIn('status', ['Dijadwalkan', 'Berlangsung'])
            ->whereDate('tanggal', $h2Date)
            ->get();

        foreach ($rapatH2 as $rapat) {
            $pimpinanNama = $rapat->pimpinanGuru->inisial ?? $rapat->pimpinanGuru->nama ?? $rapat->pimpinan ?? '-';
            $sekretarisNama = $rapat->sekretarisGuru->inisial ?? $rapat->sekretarisGuru->nama ?? $rapat->sekretaris ?? '-';

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

        // 1b. Pengingat Rapat Hari H
        $rapatHariH = Rapat::with(['pimpinanGuru', 'sekretarisGuru'])
            ->whereIn('status', ['Dijadwalkan', 'Berlangsung'])
            ->whereDate('tanggal', $today->format('Y-m-d'))
            ->get();

        foreach ($rapatHariH as $rapat) {
            $pimpinanNama = $rapat->pimpinanGuru->inisial ?? $rapat->pimpinanGuru->nama ?? $rapat->pimpinan ?? '-';
            $sekretarisNama = $rapat->sekretarisGuru->inisial ?? $rapat->sekretarisGuru->nama ?? $rapat->sekretaris ?? '-';

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

        // ========================================
        // 2. KEGIATAN
        // ========================================

        // 2a. Undangan Kegiatan H-2 (HANYA kegiatan non-rutin/ekstra)
        $kegiatanH2 = Kegiatan::with(['penanggungJawab'])
            ->where('status', 'aktif')
            ->whereNull('kegiatan_rutin_id') // Kegiatan ekstra/rutin ditangani di loop 3
            ->whereDate('waktu_mulai', $h2Date)
            ->get();

        foreach ($kegiatanH2 as $kegiatan) {
            $pjNama = $kegiatan->penanggungJawab->inisial ?? $kegiatan->penanggungJawab->nama ?? $kegiatan->penanggung_jawab ?? '-';

            $message = $wa->renderTemplate('undangan_kegiatan', [
                'nama_kegiatan' => $kegiatan->nama_kegiatan,
                'tempat' => $kegiatan->tempat ?? '-',
                'tanggal' => Carbon::parse($kegiatan->waktu_mulai)->translatedFormat('l, d F Y'),
                'waktu' => Carbon::parse($kegiatan->waktu_mulai)->format('H:i'),
                'penanggung_jawab' => $pjNama,
                'kepala_madrasah' => $kepalaMadrasah,
            ]);

            if ($dryRun) {
                $this->info("=== DRY RUN - Undangan Kegiatan H-2 ===");
                $this->line($message);
            } else {
                $wa->sendToGroup($message);
                usleep(1000000);
            }
            $sent++;
        }

        // 2b. Pengingat Kegiatan Hari H (HANYA kegiatan non-rutin/ekstra)
        $kegiatanHariH = Kegiatan::with(['penanggungJawab'])
            ->where('status', 'aktif')
            ->whereNull('kegiatan_rutin_id') // Kegiatan ekstra/rutin ditangani di loop 3
            ->whereDate('waktu_mulai', $today->format('Y-m-d'))
            ->get();

        foreach ($kegiatanHariH as $kegiatan) {
            $pjNama = $kegiatan->penanggungJawab->inisial ?? $kegiatan->penanggungJawab->nama ?? $kegiatan->penanggung_jawab ?? '-';

            $message = $wa->renderTemplate('pengingat_kegiatan', [
                'nama_kegiatan' => $kegiatan->nama_kegiatan,
                'tempat' => $kegiatan->tempat ?? '-',
                'waktu' => Carbon::parse($kegiatan->waktu_mulai)->format('H:i'),
                'penanggung_jawab' => $pjNama,
            ]);

            if ($dryRun) {
                $this->info("=== DRY RUN - Pengingat Kegiatan Hari H ===");
                $this->line($message);
            } else {
                $wa->sendToGroup($message);
                usleep(1000000);
            }
            $sent++;
        }

        // ========================================
        // 3. KEGIATAN EKSTRA (Rutin)
        // ========================================

        // Cocokkan hari ini (Carbon locale 'id') dengan field 'hari' di kegiatan_rutins
        // Format: "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"
        $hariIni = $today->locale('id')->translatedFormat('l');

        $kegiatanEkstraHariH = KegiatanRutin::with(['penanggungJawab'])
            ->where('status', 'Aktif')
            ->where('hari', $hariIni)
            ->get();

        foreach ($kegiatanEkstraHariH as $kegiatan) {
            $pjNama = $kegiatan->penanggungJawab->inisial ?? $kegiatan->penanggungJawab->nama ?? '-';

            $message = $wa->renderTemplate('pengingat_kegiatan_ekstra', [
                'nama_kegiatan'    => $kegiatan->nama_kegiatan,
                'tempat'           => $kegiatan->tempat ?? '-',
                'waktu'            => substr($kegiatan->jam_mulai, 0, 5),
                'hari'             => $hariIni,
                'jenis_kegiatan'   => $kegiatan->jenis_kegiatan ?? '-',
                'penanggung_jawab' => $pjNama,
            ]);

            if ($dryRun) {
                $this->info("=== DRY RUN - Pengingat Kegiatan Ekstra ({$kegiatan->nama_kegiatan}) ===");
                $this->line($message);
            } else {
                $wa->sendToGroup($message);
                usleep(1000000);
            }
            $sent++;
        }

        $this->info("Total notifikasi rapat, kegiatan & kegiatan ekstra terkirim: {$sent}");
        return Command::SUCCESS;
    }
}
