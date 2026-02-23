<?php

namespace App\Console\Commands;

use App\Models\PushSubscription;
use App\Models\Guru;
use App\Models\Jadwal;
use App\Models\Kegiatan;
use App\Models\Rapat;
use App\Models\TahunAjaran;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Minishlink\WebPush\WebPush;
use Minishlink\WebPush\Subscription;

class SendPushReminders extends Command
{
    protected $signature = 'push:send-reminders';
    protected $description = 'Send web push notification reminders for upcoming jadwal, kegiatan, and rapat';

    public function handle()
    {
        $now = Carbon::now();
        $today = $now->format('Y-m-d');
        $currentTime = $now->format('H:i');
        $dayOfWeek = $now->dayOfWeek; // 0=Sunday

        $days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        $dayName = $days[$dayOfWeek];

        // Get active tahun ajaran
        $tahunAjaran = TahunAjaran::where('is_active', true)->first();
        if (!$tahunAjaran) {
            $this->info('No active tahun ajaran found.');
            return;
        }

        $notifications = [];

        // 1. Check jadwal mengajar starting in ~15 minutes
        $this->checkJadwalMengajar($dayName, $currentTime, $tahunAjaran, $notifications);

        // 2. Check kegiatan starting in ~30 minutes
        $this->checkKegiatan($today, $currentTime, $tahunAjaran, $notifications);

        // 3. Check rapat starting in ~30 minutes
        $this->checkRapat($today, $currentTime, $tahunAjaran, $notifications);

        if (empty($notifications)) {
            $this->info("No notifications to send at {$currentTime}.");
            return;
        }

        // Send all notifications
        $this->sendPushNotifications($notifications);
    }

    private function checkJadwalMengajar(string $dayName, string $currentTime, $tahunAjaran, array &$notifications)
    {
        // Find jadwal that starts in ~15 minutes
        $jadwals = Jadwal::where('hari', $dayName)
            ->where('tahun_ajaran_id', $tahunAjaran->id)
            ->with(['mapel', 'kelas', 'guru'])
            ->get();

        foreach ($jadwals as $jadwal) {
            $startTime = Carbon::createFromFormat('H:i:s', $jadwal->jam_mulai);
            $now = Carbon::createFromFormat('H:i', $currentTime);
            $diffMinutes = $now->diffInMinutes($startTime, false);

            // Send notification if class starts in 13-17 minutes (window around 15 min)
            if ($diffMinutes >= 13 && $diffMinutes <= 17) {
                $guruId = $jadwal->guru_id;
                $guru = $jadwal->guru;
                if (!$guru)
                    continue;

                $mapelName = $jadwal->mapel?->nama ?? 'Mata Pelajaran';
                $kelasName = $jadwal->kelas?->nama ?? 'Kelas';
                $jamMulai = Carbon::createFromFormat('H:i:s', $jadwal->jam_mulai)->format('H:i');

                $notifications[] = [
                    'type' => 'jadwal',
                    'user_id' => $guru->user_id,
                    'title' => '📚 Jadwal Mengajar 15 Menit Lagi',
                    'body' => "{$mapelName} - {$kelasName} pukul {$jamMulai}",
                    'url' => '/guru/absensi/mengajar',
                    'tag' => "jadwal-{$jadwal->id}-{$currentTime}",
                ];
            }
        }
    }

    private function checkKegiatan(string $today, string $currentTime, $tahunAjaran, array &$notifications)
    {
        // waktu_mulai is a datetime column, so use whereDate
        $kegiatans = Kegiatan::where('tahun_ajaran_id', $tahunAjaran->id)
            ->whereDate('waktu_mulai', $today)
            ->get();

        foreach ($kegiatans as $kegiatan) {
            if (!$kegiatan->waktu_mulai)
                continue;

            $startTime = Carbon::parse($kegiatan->waktu_mulai);
            $now = Carbon::now();
            $diffMinutes = $now->diffInMinutes($startTime, false);

            // Send notification if kegiatan starts in 28-32 minutes (window around 30 min)
            if ($diffMinutes >= 28 && $diffMinutes <= 32) {
                $jamMulai = $startTime->format('H:i');

                // Send to all active guru
                $guruList = Guru::where('status', 'Aktif')
                    ->whereNotNull('user_id')
                    ->get();

                foreach ($guruList as $guru) {
                    $notifications[] = [
                        'type' => 'kegiatan',
                        'user_id' => $guru->user_id,
                        'title' => '📋 Kegiatan 30 Menit Lagi',
                        'body' => "{$kegiatan->nama_kegiatan} pukul {$jamMulai}",
                        'url' => '/guru/absensi/kegiatan',
                        'tag' => "kegiatan-{$kegiatan->id}-{$currentTime}",
                    ];
                }
            }
        }
    }

    private function checkRapat(string $today, string $currentTime, $tahunAjaran, array &$notifications)
    {
        $rapats = Rapat::where('tahun_ajaran_id', $tahunAjaran->id)
            ->where('tanggal', $today)
            ->get();

        foreach ($rapats as $rapat) {
            if (!$rapat->waktu_mulai)
                continue;

            $startTime = Carbon::createFromFormat('H:i:s', $rapat->waktu_mulai);
            $now = Carbon::createFromFormat('H:i', $currentTime);
            $diffMinutes = $now->diffInMinutes($startTime, false);

            // Send notification if rapat starts in 28-32 minutes (window around 30 min)
            if ($diffMinutes >= 28 && $diffMinutes <= 32) {
                $jamMulai = $startTime->format('H:i');

                // Send to all active guru
                $guruList = Guru::where('status', 'Aktif')
                    ->whereNotNull('user_id')
                    ->get();

                foreach ($guruList as $guru) {
                    $notifications[] = [
                        'type' => 'rapat',
                        'user_id' => $guru->user_id,
                        'title' => '🤝 Rapat 30 Menit Lagi',
                        'body' => "{$rapat->agenda_rapat} - {$rapat->tempat} pukul {$jamMulai}",
                        'url' => '/guru/absensi/rapat',
                        'tag' => "rapat-{$rapat->id}-{$currentTime}",
                    ];
                }
            }
        }
    }

    private function sendPushNotifications(array $notifications)
    {
        $vapidPublicKey = config('services.webpush.vapid_public_key');
        $vapidPrivateKey = config('services.webpush.vapid_private_key');

        if (!$vapidPublicKey || !$vapidPrivateKey) {
            $this->error('VAPID keys not configured. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in .env');
            return;
        }

        $auth = [
            'VAPID' => [
                'subject' => config('app.url', 'https://example.com'),
                'publicKey' => $vapidPublicKey,
                'privateKey' => $vapidPrivateKey,
            ],
        ];

        try {
            $webPush = new WebPush($auth);
        } catch (\Exception $e) {
            $this->error('Failed to init WebPush: ' . $e->getMessage());
            return;
        }

        $sent = 0;
        $failed = 0;
        $skipped = 0;

        // Group notifications by user
        $byUser = [];
        foreach ($notifications as $n) {
            $byUser[$n['user_id']][] = $n;
        }

        foreach ($byUser as $userId => $userNotifs) {
            $subscriptions = PushSubscription::where('user_id', $userId)->get();

            if ($subscriptions->isEmpty()) {
                $skipped += count($userNotifs);
                continue;
            }

            foreach ($subscriptions as $sub) {
                foreach ($userNotifs as $notif) {
                    // Check if this notification type is enabled
                    if (!$sub->isEnabled($notif['type'])) {
                        $skipped++;
                        continue;
                    }

                    $subscription = Subscription::create([
                        'endpoint' => $sub->endpoint,
                        'publicKey' => $sub->public_key,
                        'authToken' => $sub->auth_token,
                    ]);

                    $payload = json_encode([
                        'title' => $notif['title'],
                        'body' => $notif['body'],
                        'url' => $notif['url'],
                        'tag' => $notif['tag'],
                        'icon' => '/pwa-icon/192',
                        'badge' => '/pwa-icon/72',
                    ]);

                    $webPush->queueNotification($subscription, $payload);
                }
            }
        }

        // Send all queued notifications
        foreach ($webPush->flush() as $report) {
            if ($report->isSuccess()) {
                $sent++;
            } else {
                $failed++;
                $endpoint = $report->getEndpoint();
                $reason = $report->getReason();
                $this->warn("Failed: {$reason} (endpoint: {$endpoint})");

                // Remove expired/invalid subscriptions
                if ($report->isSubscriptionExpired()) {
                    PushSubscription::where('endpoint', $endpoint)->delete();
                    $this->info("Removed expired subscription: {$endpoint}");
                }
            }
        }

        $this->info("Push notifications: {$sent} sent, {$failed} failed, {$skipped} skipped");
    }
}
