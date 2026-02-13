<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Kegiatan;
use App\Models\Rapat;
use App\Models\Guru;
use App\Models\AbsensiKegiatan;
use App\Models\AbsensiRapat;
use App\Services\WhatsappService;
use Illuminate\Support\Carbon;

class WaSendActivityReport extends Command
{
    protected $signature = 'wa:activity-report {--dry-run : Preview tanpa kirim}';
    protected $description = 'Kirim laporan kegiatan dan rapat hari ini ke grup WA';

    public function handle()
    {
        $wa = new WhatsappService();
        $dryRun = $this->option('dry-run');
        $today = Carbon::now()->format('Y-m-d');
        $hasContent = false;

        // 1. Laporan Rapat
        $rapatList = Rapat::with(['pimpinanGuru', 'sekretarisGuru'])
            ->where('status', 'aktif')
            ->whereDate('tanggal', $today)
            ->get();

        foreach ($rapatList as $rapat) {
            $pimpinanNama = $rapat->pimpinanGuru->nama ?? $rapat->pimpinan ?? '-';
            $sekretarisNama = $rapat->sekretarisGuru->nama ?? $rapat->sekretaris ?? '-';

            // Build kehadiran list
            $daftarKehadiran = '';
            $absensi = AbsensiRapat::where('rapat_id', $rapat->id)
                ->whereDate('tanggal', $today)
                ->first();

            // Collect all participant guru IDs
            $allGuruIds = [];
            if ($rapat->pimpinan_id)
                $allGuruIds[] = $rapat->pimpinan_id;
            if ($rapat->sekretaris_id)
                $allGuruIds[] = $rapat->sekretaris_id;
            if (is_array($rapat->peserta_rapat)) {
                $allGuruIds = array_merge($allGuruIds, $rapat->peserta_rapat);
            }
            $allGuruIds = array_unique($allGuruIds);
            $allGuru = Guru::whereIn('id', $allGuruIds)->get()->keyBy('id');

            foreach ($allGuruIds as $guruId) {
                $guru = $allGuru[$guruId] ?? null;
                if (!$guru)
                    continue;

                $nama = $guru->nama;
                $role = '-';
                $status = '❌';

                if ($guruId == $rapat->pimpinan_id) {
                    $role = 'PIMPINAN RAPAT';
                    if ($absensi && $absensi->pimpinan_status === 'H') {
                        $status = '✅';
                    }
                } elseif ($guruId == $rapat->sekretaris_id) {
                    $role = 'SEKRETARIS RAPAT';
                    // Check in peserta array
                    if ($absensi && is_array($absensi->absensi_peserta)) {
                        foreach ($absensi->absensi_peserta as $p) {
                            if (($p['guru_id'] ?? 0) == $guruId && ($p['status'] ?? '') === 'H') {
                                $status = '✅';
                            }
                        }
                    }
                } else {
                    // Regular peserta
                    if ($absensi && is_array($absensi->absensi_peserta)) {
                        foreach ($absensi->absensi_peserta as $p) {
                            if (($p['guru_id'] ?? 0) == $guruId) {
                                if (($p['status'] ?? '') === 'H') {
                                    $status = '✅';
                                    $role = 'ANGGOTA';
                                }
                            }
                        }
                    }
                }

                $daftarKehadiran .= "{$nama} | {$role} | {$status}\n";
            }

            // Get notulensi
            $notulensi = '-';
            if ($absensi && !empty($absensi->notulensi)) {
                $notulensi = $absensi->notulensi;
            }

            $message = $wa->renderTemplate('laporan_rapat', [
                'agenda' => $rapat->agenda_rapat,
                'tanggal' => Carbon::parse($rapat->tanggal)->translatedFormat('l, d F Y'),
                'tempat' => $rapat->tempat ?? '-',
                'pimpinan' => $pimpinanNama,
                'sekretaris' => $sekretarisNama,
                'daftar_kehadiran' => trim($daftarKehadiran),
                'notulensi' => $notulensi,
            ]);

            if ($dryRun) {
                $this->info("=== DRY RUN - Laporan Rapat ===");
                $this->line($message);
            } else {
                $wa->sendToGroup($message);
                usleep(1000000);
            }
            $hasContent = true;
        }

        // 2. Laporan Kegiatan
        $kegiatanList = Kegiatan::with(['penanggungJawab'])
            ->where('status', 'aktif')
            ->whereDate('waktu_mulai', $today)
            ->get();

        foreach ($kegiatanList as $kegiatan) {
            $pjNama = $kegiatan->penanggungJawab->nama ?? $kegiatan->penanggung_jawab ?? '-';

            // Build kehadiran list
            $daftarKehadiran = '';
            $absensi = AbsensiKegiatan::where('kegiatan_id', $kegiatan->id)
                ->whereDate('tanggal', $today)
                ->first();

            // Collect guru IDs
            $guruIds = [];
            if ($kegiatan->penanggung_jawab_id)
                $guruIds[] = $kegiatan->penanggung_jawab_id;
            if (is_array($kegiatan->guru_pendamping)) {
                $guruIds = array_merge($guruIds, $kegiatan->guru_pendamping);
            }
            $guruIds = array_unique($guruIds);
            $allGuru = Guru::whereIn('id', $guruIds)->get()->keyBy('id');

            foreach ($guruIds as $guruId) {
                $guru = $allGuru[$guruId] ?? null;
                if (!$guru)
                    continue;

                $nama = $guru->nama;
                $role = 'PENDAMPING';
                $status = '❌';

                if ($guruId == $kegiatan->penanggung_jawab_id) {
                    $role = 'PENANGGUNG JAWAB';
                    if ($absensi && ($absensi->pj_status ?? '') === 'H') {
                        $status = '✅';
                    }
                } else {
                    if ($absensi && is_array($absensi->absensi_pendamping ?? null)) {
                        foreach ($absensi->absensi_pendamping as $p) {
                            if (($p['guru_id'] ?? 0) == $guruId && ($p['status'] ?? '') === 'H') {
                                $status = '✅';
                            }
                        }
                    }
                }

                $daftarKehadiran .= "{$nama} | {$role} | {$status}\n";
            }

            $message = $wa->renderTemplate('laporan_kegiatan', [
                'nama_kegiatan' => $kegiatan->nama_kegiatan,
                'tanggal' => Carbon::parse($kegiatan->waktu_mulai)->translatedFormat('l, d F Y'),
                'tempat' => $kegiatan->tempat ?? '-',
                'penanggung_jawab' => $pjNama,
                'daftar_kehadiran' => trim($daftarKehadiran),
            ]);

            if ($dryRun) {
                $this->info("=== DRY RUN - Laporan Kegiatan ===");
                $this->line($message);
            } else {
                $wa->sendToGroup($message);
                usleep(1000000);
            }
            $hasContent = true;
        }

        if (!$hasContent) {
            $this->info('Tidak ada kegiatan atau rapat hari ini');
        } else {
            $this->info('Laporan aktivitas terkirim');
        }

        return Command::SUCCESS;
    }
}
