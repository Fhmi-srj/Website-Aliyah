<?php

namespace App\Services;

use App\Models\AttendanceToken;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class WhatsappService
{
    protected ?string $url;
    protected ?string $apiKey;
    protected ?string $sender;
    protected ?string $groupId;

    public function __construct()
    {
        $this->url = config('services.mpwa.url');
        $this->apiKey = config('services.mpwa.api_key');
        $this->sender = config('services.mpwa.sender');
        $this->groupId = config('services.mpwa.group_id', '');
    }

    /**
     * Check if MPWA is configured
     */
    public function isConfigured(): bool
    {
        return !empty($this->url) && !empty($this->apiKey) && !empty($this->sender);
    }

    /**
     * Format phone number to 62xxx format
     */
    public function formatNumber(string $number): string
    {
        // Don't format group IDs
        if (str_contains($number, '@g.us')) {
            return $number;
        }

        // Remove spaces, dashes, parentheses
        $number = preg_replace('/[\s\-\(\)\+]/', '', $number);

        // Convert 08xx to 628xx
        if (str_starts_with($number, '08')) {
            $number = '62' . substr($number, 1);
        }

        // Convert +62 to 62
        if (str_starts_with($number, '+62')) {
            $number = substr($number, 1);
        }

        return $number;
    }

    /**
     * Send a text message via MPWA V5
     */
    public function sendMessage(string $number, string $message): array
    {
        if (!$this->isConfigured()) {
            return [
                'success' => false,
                'message' => 'MPWA belum dikonfigurasi. Periksa MPWA_URL, MPWA_API_KEY, dan MPWA_SENDER di file .env',
            ];
        }

        $formattedNumber = $this->formatNumber($number);

        try {
            $response = Http::timeout(30)->post($this->url, [
                'api_key' => $this->apiKey,
                'sender' => $this->sender,
                'number' => $formattedNumber,
                'message' => $message,
            ]);

            $body = $response->json();

            if ($response->successful()) {
                Log::channel('whatsapp')->info('Message sent', [
                    'to' => $formattedNumber,
                    'response' => $body,
                ]);

                return [
                    'success' => true,
                    'message' => 'Pesan WhatsApp berhasil dikirim',
                    'data' => $body,
                ];
            }

            Log::channel('whatsapp')->warning('Message failed', [
                'to' => $formattedNumber,
                'status' => $response->status(),
                'response' => $body,
            ]);

            return [
                'success' => false,
                'message' => $body['message'] ?? 'Gagal mengirim pesan WhatsApp',
                'data' => $body,
            ];
        } catch (\Exception $e) {
            Log::channel('whatsapp')->error('Send error', [
                'to' => $formattedNumber,
                'error' => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'message' => 'Error: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Send a message to the configured group
     */
    public function sendToGroup(string $message): array
    {
        if (empty($this->groupId)) {
            return [
                'success' => false,
                'message' => 'Group ID belum dikonfigurasi (MPWA_GROUP_ID)',
            ];
        }

        return $this->sendMessage($this->groupId, $message);
    }

    /**
     * Send messages to multiple recipients
     */
    public function sendBulk(array $recipients): array
    {
        $results = [];

        foreach ($recipients as $recipient) {
            $number = $recipient['number'] ?? '';
            $message = $recipient['message'] ?? '';

            if (empty($number) || empty($message)) {
                $results[] = [
                    'number' => $number,
                    'success' => false,
                    'message' => 'Nomor atau pesan kosong',
                ];
                continue;
            }

            $result = $this->sendMessage($number, $message);
            $result['number'] = $this->formatNumber($number);
            $results[] = $result;

            // Small delay between messages to avoid rate limiting
            usleep(500000); // 0.5 second
        }

        return $results;
    }

    /**
     * Generate an attendance token and return the URL
     */
    public function generateAttendanceToken(int $guruId, string $type, int $referenceId, string $tanggal): string
    {
        $token = AttendanceToken::generateToken();

        AttendanceToken::create([
            'guru_id' => $guruId,
            'token' => $token,
            'type' => $type,
            'reference_id' => $referenceId,
            'tanggal' => $tanggal,
            'expires_at' => \Carbon\Carbon::parse($tanggal)->endOfDay(),
        ]);

        return url("/api/absen/{$token}");
    }

    /**
     * Render a template with variable substitution
     */
    public function renderTemplate(string $templateKey, array $vars = []): string
    {
        // Check AppSetting override first, then fallback to config
        $template = \App\Models\AppSetting::getValue("wa_template_{$templateKey}");

        if (!$template) {
            $template = config("wa_templates.{$templateKey}", '');
        }

        foreach ($vars as $key => $value) {
            $template = str_replace("{{$key}}", $value, $template);
        }

        return $template;
    }
}
