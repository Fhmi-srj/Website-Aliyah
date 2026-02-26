<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\SuratMasuk;
use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SuratMasukController extends Controller
{
    /**
     * Display a listing of surat masuk.
     */
    public function index(Request $request): JsonResponse
    {
        $query = SuratMasuk::with(['user:id,name', 'tahunAjaran:id,nama']);

        if ($request->filled('tahun_ajaran_id')) {
            $query->where('tahun_ajaran_id', $request->tahun_ajaran_id);
        }

        $data = $query->orderBy('tanggal', 'desc')->orderBy('id', 'desc')->get();

        $data->each(function ($item) {
            $item->admin_name = $item->user->name ?? '-';
            $item->file_url = $item->file_surat ? asset('storage/' . $item->file_surat) : null;
        });

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    /**
     * Store a newly created surat masuk.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'tanggal' => 'required|date',
            'tanggal_surat' => 'nullable|date',
            'pengirim' => 'nullable|string|max:255',
            'perihal' => 'nullable|string|max:255',
            'agenda' => 'nullable|string|max:255',
            'nomor_surat' => 'nullable|string|max:100',
            'keterangan' => 'nullable|string|max:500',
            'file_surat' => 'nullable|string',
            'tahun_ajaran_id' => 'nullable|exists:tahun_ajaran,id',
        ]);

        // Handle base64 file upload
        $filePath = null;
        if (!empty($validated['file_surat'])) {
            $filePath = $this->saveBase64Image($validated['file_surat']);
        }

        $surat = SuratMasuk::create([
            'user_id' => $request->user()->id,
            'tanggal' => $validated['tanggal'],
            'tanggal_surat' => $validated['tanggal_surat'] ?? null,
            'pengirim' => $validated['pengirim'] ?? null,
            'perihal' => $validated['perihal'] ?? null,
            'agenda' => $validated['agenda'] ?? null,
            'nomor_surat' => $validated['nomor_surat'] ?? null,
            'keterangan' => $validated['keterangan'] ?? null,
            'file_surat' => $filePath,
            'tahun_ajaran_id' => $validated['tahun_ajaran_id'] ?? $request->user()->tahun_ajaran_id,
        ]);

        ActivityLog::logCreate($surat, "Menambahkan surat masuk dari: " . ($surat->pengirim ?? 'Unknown'));

        return response()->json([
            'success' => true,
            'message' => 'Surat masuk berhasil ditambahkan',
            'data' => $surat->load('user:id,name'),
        ], 201);
    }

    /**
     * Update the specified surat masuk.
     */
    public function update(Request $request, SuratMasuk $suratMasuk): JsonResponse
    {
        $validated = $request->validate([
            'tanggal' => 'required|date',
            'tanggal_surat' => 'nullable|date',
            'pengirim' => 'nullable|string|max:255',
            'perihal' => 'nullable|string|max:255',
            'agenda' => 'nullable|string|max:255',
            'nomor_surat' => 'nullable|string|max:100',
            'keterangan' => 'nullable|string|max:500',
            'file_surat' => 'nullable|string',
            'tahun_ajaran_id' => 'nullable|exists:tahun_ajaran,id',
        ]);

        // Handle base64 file upload if new file provided
        if (!empty($validated['file_surat']) && str_starts_with($validated['file_surat'], 'data:')) {
            // Delete old file
            if ($suratMasuk->file_surat && Storage::disk('public')->exists($suratMasuk->file_surat)) {
                Storage::disk('public')->delete($suratMasuk->file_surat);
            }
            $validated['file_surat'] = $this->saveBase64Image($validated['file_surat']);
        } else {
            // Keep existing file
            unset($validated['file_surat']);
        }

        $oldValues = $suratMasuk->getOriginal();
        $suratMasuk->update($validated);

        ActivityLog::logUpdate($suratMasuk, $oldValues, "Mengubah surat masuk dari: " . ($suratMasuk->pengirim ?? 'Unknown'));

        return response()->json([
            'success' => true,
            'message' => 'Surat masuk berhasil diperbarui',
            'data' => $suratMasuk->load('user:id,name'),
        ]);
    }

    /**
     * Remove the specified surat masuk.
     */
    public function destroy(SuratMasuk $suratMasuk): JsonResponse
    {
        if ($suratMasuk->file_surat && Storage::disk('public')->exists($suratMasuk->file_surat)) {
            Storage::disk('public')->delete($suratMasuk->file_surat);
        }

        ActivityLog::logDelete($suratMasuk, "Menghapus surat masuk dari: " . ($suratMasuk->pengirim ?? 'Unknown'));

        $suratMasuk->delete();

        return response()->json([
            'success' => true,
            'message' => 'Surat masuk berhasil dihapus',
        ]);
    }

    /**
     * Bulk delete surat masuk.
     */
    public function bulkDelete(Request $request): JsonResponse
    {
        $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'exists:surat_masuk,id',
        ]);

        $suratList = SuratMasuk::whereIn('id', $request->ids)->get();

        foreach ($suratList as $surat) {
            if ($surat->file_surat && Storage::disk('public')->exists($surat->file_surat)) {
                Storage::disk('public')->delete($surat->file_surat);
            }
            $surat->delete();
        }

        return response()->json([
            'success' => true,
            'message' => count($request->ids) . ' surat masuk berhasil dihapus',
        ]);
    }

    /**
     * Scan letter image with Gemini Vision AI.
     */
    public function scanWithAI(Request $request): JsonResponse
    {
        $request->validate([
            'image' => 'required|string', // base64 image data
        ]);

        $apiKey = config('services.gemini.api_key');

        if (empty($apiKey)) {
            return response()->json([
                'success' => false,
                'message' => 'Gemini API key belum dikonfigurasi. Tambahkan GEMINI_API_KEY di file .env',
            ], 422);
        }

        try {
            // Extract base64 data
            $base64Image = $request->image;
            if (str_contains($base64Image, ',')) {
                $base64Image = explode(',', $base64Image)[1];
            }

            $response = Http::withoutVerifying()->timeout(30)->post(
                "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={$apiKey}",
                [
                    'contents' => [
                        [
                            'parts' => [
                                [
                                    'text' => 'Kamu adalah asisten yang membaca surat resmi/formal. Dari gambar surat ini, ekstrak informasi berikut dalam format JSON (tanpa markdown code block, hanya plain JSON):
{
    "pengirim": "nama instansi/organisasi/orang yang mengirim surat",
    "perihal": "perihal/tentang surat",
    "agenda": "agenda atau hal yang dibahas",
    "nomor_surat": "nomor surat lengkap",
    "tanggal_surat": "tanggal surat dalam format YYYY-MM-DD"
}

Jika ada informasi yang tidak ditemukan, isi dengan string kosong "".
Jawab HANYA dengan JSON, tanpa teks tambahan apapun.',
                                ],
                                [
                                    'inlineData' => [
                                        'mimeType' => 'image/jpeg',
                                        'data' => $base64Image,
                                    ],
                                ],
                            ],
                        ],
                    ],
                    'generationConfig' => [
                        'temperature' => 0.1,
                        'maxOutputTokens' => 500,
                    ],
                ]
            );

            if (!$response->successful()) {
                Log::error('Gemini API Error', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Gagal menghubungi Gemini API: ' . $response->status(),
                ], 500);
            }

            $result = $response->json();
            $text = $result['candidates'][0]['content']['parts'][0]['text'] ?? '';

            // Clean the response - remove markdown code blocks if present
            $text = trim($text);
            $text = preg_replace('/^```(?:json)?\s*/i', '', $text);
            $text = preg_replace('/\s*```$/i', '', $text);
            $text = trim($text);

            $parsed = json_decode($text, true);

            if (!$parsed) {
                Log::warning('Gemini AI parse error', ['raw_text' => $text]);
                return response()->json([
                    'success' => false,
                    'message' => 'Gagal membaca hasil AI. Silakan coba lagi atau isi manual.',
                    'raw' => $text,
                ], 422);
            }

            return response()->json([
                'success' => true,
                'message' => 'Surat berhasil dibaca oleh AI',
                'data' => [
                    'pengirim' => $parsed['pengirim'] ?? '',
                    'perihal' => $parsed['perihal'] ?? '',
                    'agenda' => $parsed['agenda'] ?? '',
                    'nomor_surat' => $parsed['nomor_surat'] ?? '',
                    'tanggal_surat' => $parsed['tanggal_surat'] ?? '',
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Gemini AI scan error', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat memproses gambar: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Save base64 image to storage.
     */
    private function saveBase64Image(string $base64): string
    {
        $imageData = $base64;
        if (str_contains($imageData, ',')) {
            $imageData = explode(',', $imageData)[1];
        }

        $decoded = base64_decode($imageData);
        $filename = 'surat-masuk/' . uniqid() . '_' . time() . '.jpg';

        Storage::disk('public')->put($filename, $decoded);

        return $filename;
    }
}
