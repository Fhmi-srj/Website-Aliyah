<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Jadwal;
use App\Models\Kegiatan;
use App\Models\Rapat;
use App\Models\AbsensiMengajar;
use App\Models\AbsensiKegiatan;
use App\Models\AbsensiRapat;
use App\Models\Guru;
use App\Models\TahunAjaran;
use App\Services\WhatsappService;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;

class WaSendAbsenReminder extends Command
{
    protected $signature = 'wa:absen-reminder {--dry-run : Preview tanpa kirim}';
    protected $description = 'Kirim reminder absensi ke guru personal 30 menit setelah waktu mulai';

    protected $dayMap = [
        'Senin' => Carbon::MONDAY,
        'Selasa' => Carbon::TUESDAY,
        'Rabu' => Carbon::WEDNESDAY,
        'Kamis' => Carbon::THURSDAY,
        'Jumat' => Carbon::FRIDAY,
        'Sabtu' => Carbon::SATURDAY,
        'Minggu' => Carbon::SUNDAY,
    ];

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
        $delay = (int) config('services.mpwa.absen_reminder_delay', 30);
        $today = $now->format('Y-m-d');
        $hariIni = $this->dayNames[$now->dayOfWeek] ?? null;

        if (!$hariIni) {
            $this->info('Hari ini tidak ada jadwal (Minggu)');
            return Command::SUCCESS;
        }

        $sent = 0;

        // 1. Reminder Mengajar
        $sent += $this->processRemindMengajar($wa, $now, $today, $hariIni, $delay, $dryRun);

        // 2. Reminder Kegiatan
        $sent += $this->processRemindKegiatan($wa, $now, $today, $delay, $dryRun);

        // 3. Reminder Rapat
        $sent += $this->processRemindRapat($wa, $now, $today, $delay, $dryRun);

        $this->info("Total reminder terkirim: {$sent}");
        return Command::SUCCESS;
    }

    protected function processRemindMengajar($wa, Carbon $now, string $today, string $hariIni, int $delay, bool $dryRun): int
    {
        $jadwalList = Jadwal::with(['guru', 'mapel', 'kelas'])
            ->where('status', 'aktif')
            ->where('hari', $hariIni)
            ->whereNotNull('guru_id')
            ->get();

        $sent = 0;

        foreach ($jadwalList as $jadwal) {
            if (!$jadwal->guru || empty($jadwal->guru->kontak))
                continue;

            // Check if 30 (delay) minutes after jam_mulai
            $jamMulai = Carbon::parse($today . ' ' . $jadwal->jam_mulai);
            $triggerTime = $jamMulai->copy()->addMinutes($delay);

            // Only trigger within a 5 minute window
            if ($now->lt($triggerTime) || $now->gt($triggerTime->copy()->addMinutes(5))) {
                continue;
            }

            // Check if already submitted attendance
            $alreadyAbsen = AbsensiMengajar::where('jadwal_id', $jadwal->id)
                ->whereDate('tanggal', $today)
                ->whereNotNull('absensi_time')
                ->exists();

            if ($alreadyAbsen)
                continue;

            // Generate token link
            $link = $wa->generateAttendanceToken(
                $jadwal->guru_id,
                'mengajar',
                $jadwal->id,
                $today
            );

            $message = $wa->renderTemplate('reminder_mengajar', [
                'guru_nama' => $jadwal->guru->nama,
                'mapel' => $jadwal->mapel->nama ?? '-',
                'kelas' => $jadwal->kelas->nama ?? '-',
                'jam' => $jadwal->jam_mulai . ' - ' . $jadwal->jam_selesai,
                'hari' => $hariIni,
                'tanggal' => Carbon::parse($today)->translatedFormat('d F Y'),
                'link' => $link,
            ]);

            if ($dryRun) {
                $mapelNama = $jadwal->mapel->nama ?? '-';
                $this->line("[DRY] → {$jadwal->guru->nama} ({$jadwal->guru->kontak}): Mengajar {$mapelNama}");
            } else {
                $wa->sendMessage($jadwal->guru->kontak, $message);
                usleep(500000);
            }
            $sent++;
        }

        $this->info("[MENGAJAR] {$sent} reminder");
        return $sent;
    }

    protected function processRemindKegiatan($wa, Carbon $now, string $today, int $delay, bool $dryRun): int
    {
        $kegiatanList = Kegiatan::with(['penanggungJawab'])
            ->where('status', 'aktif')
            ->whereDate('waktu_mulai', $today)
            ->get();

        $sent = 0;

        foreach ($kegiatanList as $kegiatan) {
            $waktuMulai = Carbon::parse($kegiatan->waktu_mulai);
            $triggerTime = $waktuMulai->copy()->addMinutes($delay);

            if ($now->lt($triggerTime) || $now->gt($triggerTime->copy()->addMinutes(5))) {
                continue;
            }

            // Check if already submitted
            $alreadyAbsen = AbsensiKegiatan::where('kegiatan_id', $kegiatan->id)
                ->whereDate('tanggal', $today)
                ->exists();

            if ($alreadyAbsen)
                continue;

            // Send to PJ
            $guruIds = [];
            if ($kegiatan->penanggung_jawab_id) {
                $guruIds[] = $kegiatan->penanggung_jawab_id;
            }
            // Send to pendamping
            if (is_array($kegiatan->guru_pendamping)) {
                $guruIds = array_merge($guruIds, $kegiatan->guru_pendamping);
            }

            $guruList = Guru::whereIn('id', array_unique($guruIds))
                ->whereNotNull('kontak')
                ->where('kontak', '!=', '')
                ->get();

            foreach ($guruList as $guru) {
                $link = $wa->generateAttendanceToken(
                    $guru->id,
                    'kegiatan',
                    $kegiatan->id,
                    $today
                );

                $message = $wa->renderTemplate('reminder_kegiatan', [
                    'guru_nama' => $guru->nama,
                    'kegiatan' => $kegiatan->nama_kegiatan,
                    'tempat' => $kegiatan->tempat ?? '-',
                    'waktu' => $waktuMulai->format('H:i'),
                    'tanggal' => Carbon::parse($today)->translatedFormat('d F Y'),
                    'link' => $link,
                ]);

                if ($dryRun) {
                    $this->line("[DRY] → {$guru->nama} ({$guru->kontak}): Kegiatan {$kegiatan->nama_kegiatan}");
                } else {
                    $wa->sendMessage($guru->kontak, $message);
                    usleep(500000);
                }
                $sent++;
            }
        }

        $this->info("[KEGIATAN] {$sent} reminder");
        return $sent;
    }

    protected function processRemindRapat($wa, Carbon $now, string $today, int $delay, bool $dryRun): int
    {
        $rapatList = Rapat::where('status', 'aktif')
            ->whereDate('tanggal', $today)
            ->get();

        $sent = 0;

        foreach ($rapatList as $rapat) {
            $waktuMulai = Carbon::parse($today . ' ' . substr($rapat->waktu_mulai, 0, 5));
            $triggerTime = $waktuMulai->copy()->addMinutes($delay);

            if ($now->lt($triggerTime) || $now->gt($triggerTime->copy()->addMinutes(5))) {
                continue;
            }

            // Check if already submitted
            $alreadyAbsen = AbsensiRapat::where('rapat_id', $rapat->id)
                ->whereDate('tanggal', $today)
                ->exists();

            if ($alreadyAbsen)
                continue;

            // Collect all participant guru IDs
            $guruIds = [];
            if ($rapat->pimpinan_id)
                $guruIds[] = $rapat->pimpinan_id;
            if ($rapat->sekretaris_id)
                $guruIds[] = $rapat->sekretaris_id;
            if (is_array($rapat->peserta_rapat)) {
                $guruIds = array_merge($guruIds, $rapat->peserta_rapat);
            }

            $guruList = Guru::whereIn('id', array_unique($guruIds))
                ->whereNotNull('kontak')
                ->where('kontak', '!=', '')
                ->get();

            foreach ($guruList as $guru) {
                $link = $wa->generateAttendanceToken(
                    $guru->id,
                    'rapat',
                    $rapat->id,
                    $today
                );

                $message = $wa->renderTemplate('reminder_rapat', [
                    'guru_nama' => $guru->nama,
                    'agenda' => $rapat->agenda_rapat,
                    'tempat' => $rapat->tempat ?? '-',
                    'waktu' => substr($rapat->waktu_mulai, 0, 5),
                    'tanggal' => Carbon::parse($today)->translatedFormat('d F Y'),
                    'link' => $link,
                ]);

                if ($dryRun) {
                    $this->line("[DRY] → {$guru->nama} ({$guru->kontak}): Rapat {$rapat->agenda_rapat}");
                } else {
                    $wa->sendMessage($guru->kontak, $message);
                    usleep(500000);
                }
                $sent++;
            }
        }

        $this->info("[RAPAT] {$sent} reminder");
        return $sent;
    }
}
