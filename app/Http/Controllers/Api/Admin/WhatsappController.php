<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AppSetting;
use App\Services\WhatsappService;
use Illuminate\Http\Request;

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
}
