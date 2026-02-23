<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AppSetting;
use App\Models\Jadwal;
use App\Models\AbsensiMengajar;
use App\Models\Rapat;
use App\Models\Kegiatan;
use App\Models\Guru;
use App\Models\AbsensiRapat;
use App\Models\AbsensiKegiatan;
use App\Services\WhatsappService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class WhatsappController extends Controller
{
    /**
     * Get MPWA configuration status
     */
    public function getStatus()
    {
        $wa = new WhatsappService();

        return response()->json([
            'success' => true,
            'data' => [
                'configured' => $wa->isConfigured(),
                'sender' => config('services.mpwa.sender'),
                'url' => config('services.mpwa.url') ? true : false,
                'group_id' => config('services.mpwa.group_id') ? true : false,
                'debug' => [
                    'url_empty' => empty(config('services.mpwa.url')),
                    'key_empty' => empty(config('services.mpwa.api_key')),
                    'sender_empty' => empty(config('services.mpwa.sender')),
                    'url_preview' => substr(config('services.mpwa.url'), 0, 10) . '...',
                    'key_preview' => substr(config('services.mpwa.api_key'), 0, 3) . '***',
                    'sender_preview' => substr(config('services.mpwa.sender'), 0, 3) . '***',
                ]
            ],
        ]);
    }

    /**
     * Send a test WhatsApp message
     */
    public function sendTest(Request $request)
    {
        $request->validate([
            'number' => 'required|string|min:10',
            'message' => 'nullable|string|max:1000',
        ]);

        $wa = new WhatsappService();

        $number = $request->input('number');
        $message = $request->input('message', "\u{2705} *Test MPWA V5*" . "\n\n" . 'Pesan ini dikirim otomatis dari sistem ' . config('app.name') . '.' . "\n" . 'Waktu: ' . now()->format('d/m/Y H:i:s'));

        $result = $wa->sendMessage($number, $message);

        return response()->json($result);
    }

    /**
     * Send a test WhatsApp message using a specific notification template with dummy data
     */
    public function sendTestTemplate(Request $request)
    {
        $request->validate([
            'type' => 'required|string|in:jadwal_harian,rekap_absensi,laporan_kegiatan,undangan_rapat,reminder_absen',
            'number' => 'required|string|min:10',
        ]);

        $wa = new WhatsappService();
        $type = $request->input('type');
        $number = $request->input('number');

        $today = now();
        $hari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][$today->dayOfWeek];
        $tanggal = $today->format('d/m/Y');

        $dummyMessages = [
            'jadwal_harian' => $wa->renderTemplate('jadwal_harian', [
                'hari' => $hari,
                'tanggal' => $tanggal,
                'daftar_jadwal' => implode("\n", [
                    "1. *Ahmad Fauzi* - Matematika (X-A) | 07:00-08:30",
                    "2. *Siti Aisyah* - B. Indonesia (XI-B) | 08:30-10:00",
                    "3. *Budi Santoso* - Fisika (XII-A) | 10:15-11:45",
                ]),
            ]),
            'rekap_absensi' => $wa->renderTemplate('rekap_absensi', [
                'hari' => $hari,
                'tanggal' => $tanggal,
                'daftar_rekap' => implode("\n", [
                    "\u{2705} Ahmad Fauzi - Hadir (07:05)",
                    "\u{2705} Siti Aisyah - Hadir (08:25)",
                    "\u{2705} Budi Santoso - Hadir (10:10)",
                    "\u{274C} Dewi Lestari - Belum Absen",
                    "\u{274C} Eko Prasetyo - Belum Absen",
                    "",
                    "Total: 3/5 guru sudah absen",
                ]),
            ]),
            'laporan_kegiatan' => $wa->renderTemplate('laporan_kegiatan', [
                'nama_kegiatan' => 'Workshop Kurikulum Merdeka',
                'tanggal' => $tanggal,
                'tempat' => 'Aula MA Alhikam',
                'penanggung_jawab' => 'Ahmad Fauzi, S.Pd',
                'daftar_kehadiran' => implode("\n", [
                    "\u{2705} Ahmad Fauzi",
                    "\u{2705} Siti Aisyah",
                    "\u{2705} Budi Santoso",
                    "\u{274C} Dewi Lestari (Izin)",
                ]),
            ]),
            'undangan_rapat' => $wa->renderTemplate('undangan_rapat', [
                'tanggal' => $today->addDays(2)->translatedFormat('l, d F Y'),
                'tempat' => 'Ruang Rapat MA Alhikam',
                'agenda' => 'Evaluasi Semester Genap & Persiapan UAS',
                'waktu' => '09:00',
                'kepala_madrasah' => 'Dr. H. Muhammad Ali, M.Pd',
                'pimpinan' => 'Ahmad Fauzi, S.Pd',
                'sekretaris' => 'Siti Aisyah, S.Pd',
            ]),
            'reminder_absen' => $wa->renderTemplate('reminder_mengajar', [
                'guru_nama' => 'Bapak/Ibu Guru',
                'mapel' => 'Matematika Peminatan',
                'kelas' => 'XII-A',
                'jam' => '07:00 - 08:30',
                'hari' => $hari,
                'tanggal' => $tanggal,
                'link' => url('/api/absen/TEST-TOKEN-DUMMY-12345'),
            ]),
        ];

        $message = $dummyMessages[$type] ?? '';

        if (empty($message)) {
            return response()->json(['success' => false, 'message' => 'Template tidak ditemukan']);
        }

        // Add test label header
        $message = "\u{1F9EA} *[TEST MODE]*\n\n" . $message;

        $result = $wa->sendMessage($number, $message);

        return response()->json($result);
    }

    /**
     * Get schedule settings
     */
    public function getScheduleSettings()
    {
        return response()->json([
            'success' => true,
            'data' => [
                'wa_schedule_time' => AppSetting::getValue('wa_schedule_time', config('services.mpwa.schedule_time', '06:30')),
                'wa_recap_time' => AppSetting::getValue('wa_recap_time', config('services.mpwa.recap_time', '13:30')),
                'wa_activity_report_time' => AppSetting::getValue('wa_activity_report_time', config('services.mpwa.activity_report_time', '18:00')),
                'wa_meeting_invite_time' => AppSetting::getValue('wa_meeting_invite_time', config('services.mpwa.meeting_invite_time', '07:00')),
                'wa_absen_reminder_delay' => AppSetting::getValue('wa_absen_reminder_delay', config('services.mpwa.absen_reminder_delay', 30)),
            ],
        ]);
    }

    /**
     * Update schedule settings
     */
    public function updateScheduleSettings(Request $request)
    {
        $request->validate([
            'wa_schedule_time' => 'required|date_format:H:i',
            'wa_recap_time' => 'required|date_format:H:i',
            'wa_activity_report_time' => 'required|date_format:H:i',
            'wa_meeting_invite_time' => 'required|date_format:H:i',
            'wa_absen_reminder_delay' => 'required|integer|min:5|max:120',
        ]);

        $settings = [
            'wa_schedule_time',
            'wa_recap_time',
            'wa_activity_report_time',
            'wa_meeting_invite_time',
            'wa_absen_reminder_delay',
        ];

        foreach ($settings as $key) {
            AppSetting::setValue($key, $request->input($key));
        }

        return response()->json([
            'success' => true,
            'message' => 'Pengaturan jadwal notifikasi berhasil disimpan',
        ]);
    }

    // ========================================================
    // Manual Send Endpoints (pengganti cronjob)
    // ========================================================

    private $dayNames = [0 => 'Minggu', 1 => 'Senin', 2 => 'Selasa', 3 => 'Rabu', 4 => 'Kamis', 5 => 'Jumat', 6 => 'Sabtu'];

    /**
     * Kirim jadwal harian hari ini ke grup WA
     */
    public function sendScheduleDaily()
    {
        $wa = new WhatsappService();
        if (!$wa->isConfigured()) {
            return response()->json(['success' => false, 'message' => 'WhatsApp belum dikonfigurasi']);
        }

        $now = Carbon::now();
        $hariIni = $this->dayNames[$now->dayOfWeek] ?? null;

        if (!$hariIni || $hariIni === 'Minggu') {
            return response()->json(['success' => false, 'message' => 'Hari ini hari Minggu, tidak ada jadwal']);
        }

        $jadwalList = Jadwal::with(['guru', 'mapel', 'kelas'])
            ->where('status', 'aktif')
            ->where('hari', $hariIni)
            ->orderBy('jam_mulai')
            ->get();

        if ($jadwalList->isEmpty()) {
            return response()->json(['success' => false, 'message' => 'Tidak ada jadwal aktif hari ini']);
        }

        $grouped = $jadwalList->groupBy(fn($j) => $j->kelas->nama_kelas ?? 'Tanpa Kelas');
        $daftarJadwal = '';
        foreach ($grouped as $kelas => $items) {
            $daftarJadwal .= "*Kelas {$kelas}*\n";
            foreach ($items as $j) {
                $guru = $j->guru->nama ?? '-';
                $mapel = $j->mapel->nama_mapel ?? '-';
                $jam = substr($j->jam_mulai, 0, 5) . '-' . substr($j->jam_selesai, 0, 5);
                $daftarJadwal .= "• {$mapel} - {$guru} ({$jam})\n";
            }
            $daftarJadwal .= "\n";
        }

        $message = $wa->renderTemplate('jadwal_harian', [
            'hari' => $hariIni,
            'tanggal' => $now->translatedFormat('d F Y'),
            'daftar_jadwal' => trim($daftarJadwal),
        ]);

        $result = $wa->sendToGroup($message);

        return response()->json([
            'success' => $result['success'],
            'message' => $result['success'] ? 'Jadwal harian berhasil dikirim ke grup WA' : ($result['message'] ?? 'Gagal mengirim'),
            'data' => ['total_jadwal' => $jadwalList->count()],
        ]);
    }

    /**
     * Kirim rekap absensi hari ini ke grup WA
     */
    public function sendAttendanceRecap()
    {
        $wa = new WhatsappService();
        if (!$wa->isConfigured()) {
            return response()->json(['success' => false, 'message' => 'WhatsApp belum dikonfigurasi']);
        }

        $now = Carbon::now();
        $today = $now->format('Y-m-d');
        $hariIni = $this->dayNames[$now->dayOfWeek] ?? null;

        if (!$hariIni || $hariIni === 'Minggu') {
            return response()->json(['success' => false, 'message' => 'Hari ini hari Minggu, tidak ada jadwal']);
        }

        $jadwalList = Jadwal::with(['guru', 'mapel', 'kelas'])
            ->where('status', 'aktif')
            ->where('hari', $hariIni)
            ->orderBy('jam_mulai')
            ->get();

        if ($jadwalList->isEmpty()) {
            return response()->json(['success' => false, 'message' => 'Tidak ada jadwal aktif hari ini']);
        }

        $daftarRekap = '';
        $totalHadir = 0;
        $totalBelum = 0;

        foreach ($jadwalList as $j) {
            $guru = $j->guru->nama ?? '-';
            $mapel = $j->mapel->nama_mapel ?? '-';
            $kelas = $j->kelas->nama_kelas ?? '-';
            $jam = substr($j->jam_mulai, 0, 5);

            $absensi = AbsensiMengajar::where('jadwal_id', $j->id)
                ->whereDate('tanggal', $today)
                ->first();

            if ($absensi) {
                $daftarRekap .= "✅ {$guru} - {$mapel} ({$kelas}) | Hadir ({$jam})\n";
                $totalSiswaH = 0;
                $totalSiswaI = 0;
                $totalSiswaS = 0;
                $totalSiswaA = 0;
                if (is_array($absensi->absensi_siswa)) {
                    foreach ($absensi->absensi_siswa as $s) {
                        match ($s['status'] ?? '') {
                            'H' => $totalSiswaH++,
                            'I' => $totalSiswaI++,
                            'S' => $totalSiswaS++,
                            'A' => $totalSiswaA++,
                            default => null,
                        };
                    }
                }
                $daftarRekap .= "Siswa = H = {$totalSiswaH} | I = {$totalSiswaI} | S = {$totalSiswaS} | A = {$totalSiswaA}\n\n";
                $totalHadir++;
            } else {
                $daftarRekap .= "❌ {$guru} - {$mapel} ({$kelas}) | Belum Absen\n\n";
                $totalBelum++;
            }
        }

        $daftarRekap .= "Total: {$totalHadir}/{$jadwalList->count()} guru sudah absen";

        $message = $wa->renderTemplate('rekap_absensi', [
            'hari' => $hariIni,
            'tanggal' => $now->translatedFormat('d F Y'),
            'daftar_rekap' => trim($daftarRekap),
        ]);

        $result = $wa->sendToGroup($message);

        return response()->json([
            'success' => $result['success'],
            'message' => $result['success'] ? 'Rekap absensi berhasil dikirim ke grup WA' : ($result['message'] ?? 'Gagal mengirim'),
            'data' => ['hadir' => $totalHadir, 'belum' => $totalBelum],
        ]);
    }

    /**
     * Kirim undangan rapat spesifik ke grup WA
     */
    public function sendMeetingInvitation($id)
    {
        $wa = new WhatsappService();
        if (!$wa->isConfigured()) {
            return response()->json(['success' => false, 'message' => 'WhatsApp belum dikonfigurasi']);
        }

        $rapat = Rapat::with(['pimpinanGuru', 'sekretarisGuru'])->find($id);
        if (!$rapat) {
            return response()->json(['success' => false, 'message' => 'Rapat tidak ditemukan']);
        }

        $kepalaMadrasah = AppSetting::getValue('nama_kepala_madrasah', 'Kepala MA Alhikam');
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

        $result = $wa->sendToGroup($message);

        return response()->json([
            'success' => $result['success'],
            'message' => $result['success'] ? 'Undangan rapat berhasil dikirim ke grup WA' : ($result['message'] ?? 'Gagal mengirim'),
        ]);
    }

    /**
     * Kirim laporan rapat spesifik ke grup WA
     */
    public function sendMeetingReport($id)
    {
        $wa = new WhatsappService();
        if (!$wa->isConfigured()) {
            return response()->json(['success' => false, 'message' => 'WhatsApp belum dikonfigurasi']);
        }

        $rapat = Rapat::with(['pimpinanGuru', 'sekretarisGuru'])->find($id);
        if (!$rapat) {
            return response()->json(['success' => false, 'message' => 'Rapat tidak ditemukan']);
        }

        $today = $rapat->tanggal;
        $pimpinanNama = $rapat->pimpinanGuru->nama ?? $rapat->pimpinan ?? '-';
        $sekretarisNama = $rapat->sekretarisGuru->nama ?? $rapat->sekretaris ?? '-';

        // Build kehadiran list
        $daftarKehadiran = '';
        $absensi = AbsensiRapat::where('rapat_id', $rapat->id)
            ->whereDate('tanggal', $today)
            ->first();

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
                if ($absensi && $absensi->pimpinan_status === 'H')
                    $status = '✅';
            } elseif ($guruId == $rapat->sekretaris_id) {
                $role = 'SEKRETARIS RAPAT';
                if ($absensi && is_array($absensi->absensi_peserta)) {
                    foreach ($absensi->absensi_peserta as $p) {
                        if (($p['guru_id'] ?? 0) == $guruId && ($p['status'] ?? '') === 'H')
                            $status = '✅';
                    }
                }
            } else {
                if ($absensi && is_array($absensi->absensi_peserta)) {
                    foreach ($absensi->absensi_peserta as $p) {
                        if (($p['guru_id'] ?? 0) == $guruId && ($p['status'] ?? '') === 'H') {
                            $status = '✅';
                            $role = 'ANGGOTA';
                        }
                    }
                }
            }

            $daftarKehadiran .= "{$nama} | {$role} | {$status}\n";
        }

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

        $result = $wa->sendToGroup($message);

        return response()->json([
            'success' => $result['success'],
            'message' => $result['success'] ? 'Laporan rapat berhasil dikirim ke grup WA' : ($result['message'] ?? 'Gagal mengirim'),
        ]);
    }

    /**
     * Kirim undangan kegiatan spesifik ke grup WA
     */
    public function sendActivityInvitation($id)
    {
        $wa = new WhatsappService();
        if (!$wa->isConfigured()) {
            return response()->json(['success' => false, 'message' => 'WhatsApp belum dikonfigurasi']);
        }

        $kegiatan = Kegiatan::with(['penanggungJawab'])->find($id);
        if (!$kegiatan) {
            return response()->json(['success' => false, 'message' => 'Kegiatan tidak ditemukan']);
        }

        $kepalaMadrasah = AppSetting::getValue('nama_kepala_madrasah', 'Kepala MA Alhikam');
        $pjNama = $kegiatan->penanggungJawab->nama ?? $kegiatan->penanggung_jawab ?? '-';

        $message = $wa->renderTemplate('undangan_kegiatan', [
            'nama_kegiatan' => $kegiatan->nama_kegiatan,
            'tempat' => $kegiatan->tempat ?? '-',
            'tanggal' => Carbon::parse($kegiatan->waktu_mulai)->translatedFormat('l, d F Y'),
            'waktu' => Carbon::parse($kegiatan->waktu_mulai)->format('H:i'),
            'penanggung_jawab' => $pjNama,
            'kepala_madrasah' => $kepalaMadrasah,
        ]);

        $result = $wa->sendToGroup($message);

        return response()->json([
            'success' => $result['success'],
            'message' => $result['success'] ? 'Undangan kegiatan berhasil dikirim ke grup WA' : ($result['message'] ?? 'Gagal mengirim'),
        ]);
    }

    /**
     * Kirim laporan kegiatan spesifik ke grup WA
     */
    public function sendActivityReport($id)
    {
        $wa = new WhatsappService();
        if (!$wa->isConfigured()) {
            return response()->json(['success' => false, 'message' => 'WhatsApp belum dikonfigurasi']);
        }

        $kegiatan = Kegiatan::with(['penanggungJawab'])->find($id);
        if (!$kegiatan) {
            return response()->json(['success' => false, 'message' => 'Kegiatan tidak ditemukan']);
        }

        $today = Carbon::parse($kegiatan->waktu_mulai)->format('Y-m-d');
        $pjNama = $kegiatan->penanggungJawab->nama ?? $kegiatan->penanggung_jawab ?? '-';

        // Build kehadiran list
        $daftarKehadiran = '';
        $absensi = AbsensiKegiatan::where('kegiatan_id', $kegiatan->id)
            ->whereDate('tanggal', $today)
            ->first();

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
                if ($absensi && ($absensi->pj_status ?? '') === 'H')
                    $status = '✅';
            } else {
                if ($absensi && is_array($absensi->absensi_pendamping ?? null)) {
                    foreach ($absensi->absensi_pendamping as $p) {
                        if (($p['guru_id'] ?? 0) == $guruId && ($p['status'] ?? '') === 'H')
                            $status = '✅';
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

        $result = $wa->sendToGroup($message);

        return response()->json([
            'success' => $result['success'],
            'message' => $result['success'] ? 'Laporan kegiatan berhasil dikirim ke grup WA' : ($result['message'] ?? 'Gagal mengirim'),
        ]);
    }
}
