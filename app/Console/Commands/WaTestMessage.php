<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\WhatsappService;

class WaTestMessage extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'wa:test-message {number? : Nomar WhatsApp tujuan (format 62...)} {message? : Pesan yang akan dikirim} {--group : Kirim ke grup yang dikonfigurasi}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Kirim pesan WhatsApp test menggunakan MPWA V5';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $wa = new WhatsappService();
        $isGroup = $this->option('group');
        $number = $this->argument('number');
        $message = $this->argument('message') ?? 'Halo! Ini adalah pesan test dari sistem ' . config('app.name') . ' menggunakan MPWA V5. Waktu: ' . now()->format('Y-m-d H:i:s');

        if ($isGroup) {
            $this->info('Mengirim pesan ke grup...');
            $result = $wa->sendToGroup($message);
        } else {
            if (!$number) {
                $number = $this->ask('Masukkan nomor WhatsApp tujuan (format 62...)');
            }
            
            $this->info("Mengirim pesan ke nomor: {$number}...");
            $result = $wa->sendMessage($number, $message);
        }

        if ($result['success']) {
            $this->info('Success: ' . $result['message']);
            if (isset($result['data'])) {
                $this->line(json_encode($result['data'], JSON_PRETTY_PRINT));
            }
        } else {
            $this->error('Failed: ' . $result['message']);
            if (isset($result['data'])) {
                $this->line(json_encode($result['data'], JSON_PRETTY_PRINT));
            }
        }

        return $result['success'] ? Command::SUCCESS : Command::FAILURE;
    }
}
