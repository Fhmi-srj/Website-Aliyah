<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AiController extends Controller
{
    /**
     * Rapikan teks menggunakan Gemini AI.
     * Menerima teks mentah dan mengembalikan versi rapih dalam format markdown.
     */
    public function rapikanTeks(Request $request): JsonResponse
    {
        $request->validate([
            'text' => 'required|string|min:5',
            'context' => 'required|in:notulensi,keterangan',
        ]);

        $apiKey = \App\Models\AppSetting::getValue('gemini_api_key') ?: config('services.gemini.api_key');

        if (empty($apiKey)) {
            return response()->json([
                'success' => false,
                'message' => 'Gemini API key belum dikonfigurasi.',
            ], 422);
        }

        $contextLabel = $request->context === 'notulensi' ? 'notulensi rapat' : 'keterangan kegiatan';

        $prompt = "Kamu adalah asisten editor teks profesional untuk sekolah. Rapikan teks {$contextLabel} berikut agar lebih rapi dan terstruktur.

Aturan:
- Perbaiki ejaan, tanda baca, dan huruf kapital
- Susun poin-poin menjadi numbered list yang konsisten
- Gunakan format markdown (bold untuk judul/kata kunci penting, numbered list untuk poin)
- Hilangkan karakter aneh atau tidak konsisten (·, /, dll)
- JANGAN mengubah makna atau menambah informasi baru
- JANGAN menambahkan paragraf pembuka/penutup yang tidak ada di teks asli
- Hasil harus ringkas dan to the point
- Jawab HANYA dengan teks rapih, tanpa penjelasan tambahan

Teks asli:
{$request->text}";

        try {
            $payload = [
                'contents' => [
                    [
                        'parts' => [
                            ['text' => $prompt],
                        ],
                    ],
                ],
                'generationConfig' => [
                    'temperature' => 0.2,
                    'maxOutputTokens' => 1000,
                ],
            ];

            $models = ['gemini-2.5-flash', 'gemini-2.0-flash'];
            $response = null;

            foreach ($models as $model) {
                $response = Http::withoutVerifying()->timeout(30)->post(
                    "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$apiKey}",
                    $payload
                );

                if ($response->status() !== 429) {
                    break;
                }

                Log::warning("Gemini model {$model} rate limited, trying next model...");
                sleep(1);
            }

            if (!$response->successful()) {
                $message = 'Gagal menghubungi Gemini AI: ' . $response->status();
                if ($response->status() === 429) {
                    $message = 'Kuota API Gemini habis. Tunggu 1-2 menit lalu coba lagi.';
                }

                return response()->json([
                    'success' => false,
                    'message' => $message,
                ], 500);
            }

            $result = $response->json();
            $text = $result['candidates'][0]['content']['parts'][0]['text'] ?? '';
            $text = trim($text);

            if (empty($text)) {
                return response()->json([
                    'success' => false,
                    'message' => 'AI tidak menghasilkan output. Silakan coba lagi.',
                ], 422);
            }

            return response()->json([
                'success' => true,
                'result' => $text,
            ]);
        } catch (\Exception $e) {
            Log::error('AI rapikan teks error', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan: ' . $e->getMessage(),
            ], 500);
        }
    }
}
