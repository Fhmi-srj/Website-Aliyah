<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Jadwal;
use App\Models\AbsensiMengajar;
use App\Models\AbsensiSiswa;
use App\Models\Siswa;
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
            $kelasNama = $kelas->nama_kelas ?? 'Kegiatan Ekstra / Rutin';

            $daftarRekap .= "*{$kelasNama}*\n\n";

            // Ambil kehadiran siswa langsung dari tabel absensi_siswa (per kelas, per hari)
            // Sistem daily: hanya status S/I/A yang tersimpan — H tidak disimpan
            if ($kelasId) {
                $totalSiswa = Siswa::where('kelas_id', $kelasId)->where('status', 'Aktif')->count();
                $absensiSiswaRows = AbsensiSiswa::where('kelas_id', $kelasId)
                    ->whereDate('tanggal', $today)
                    ->get();

                $totalSiswaS = $absensiSiswaRows->where('status', 'S')->count();
                $totalSiswaI = $absensiSiswaRows->where('status', 'I')->count();
                $totalSiswaA = $absensiSiswaRows->where('status', 'A')->count();
                $totalSiswaH = max(0, $totalSiswa - $totalSiswaS - $totalSiswaI - $totalSiswaA);
            }

            foreach ($jadwals as $jadwal) {
                $jam = substr($jadwal->jam_mulai, 0, 5);
                $guru = $jadwal->guru->inisial ?? $jadwal->guru->nama ?? '-';
                $mapel = $jadwal->mapel->kode_mapel ?? $jadwal->mapel->nama_mapel ?? '-';

                // Check attendance
                $absensi = AbsensiMengajar::where('jadwal_id', $jadwal->id)
                    ->whereDate('tanggal', $today)
                    ->first();

                $statusIcon = ($absensi && $absensi->absensi_time) ? '✅' : '❌';

                $daftarRekap .= "{$jam} | {$guru} | {$mapel} | {$statusIcon}\n";
            }

            // Tambahkan summary siswa HANYA jika ini kelas reguler (bukan kegiatan ekstra/rutin)
            if ($kelasId) {
                $daftarRekap .= " | \n";
                $daftarRekap .= "Siswa = H = {$totalSiswaH} | I = {$totalSiswaI} | S = {$totalSiswaS} | A = {$totalSiswaA}\n\n";
            } else {
                $daftarRekap .= "\n";
            }
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
