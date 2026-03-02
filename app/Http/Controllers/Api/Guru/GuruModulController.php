<?php

namespace App\Http\Controllers\Api\Guru;

use App\Http\Controllers\Controller;
use App\Models\ModulAjar;
use App\Models\AppSetting;
use App\Services\PrintService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Carbon;

class GuruModulController extends Controller
{
    /**
     * List modul ajar milik guru yang login
     */
    public function index(Request $request): JsonResponse
    {
        $guru = $request->user()->guru;

        if (!$guru) {
            return response()->json(['error' => 'Data guru tidak ditemukan'], 404);
        }

        $query = ModulAjar::where('guru_id', $guru->id)
            ->orderBy('updated_at', 'desc');

        if ($request->filled('mapel')) {
            $query->where('mapel', $request->mapel);
        }
        if ($request->filled('kelas')) {
            $query->where('kelas', $request->kelas);
        }
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('semester')) {
            $query->where('semester', $request->semester);
        }

        $moduls = $query->get()->map(fn($m) => $this->formatModul($m));

        // Get unique mapel and kelas for filters (from existing moduls)
        $allModuls = ModulAjar::where('guru_id', $guru->id)->get();
        $uniqueMapel = $allModuls->pluck('mapel')->unique()->sort()->values();
        $uniqueKelas = $allModuls->pluck('kelas')->unique()->sort()->values();

        // Get jadwal-based mapel/kelas for form dropdowns
        $jadwalOptions = [];
        try {
            $tahunAjaranId = $request->user()->tahun_ajaran_id;
            $jadwals = \App\Models\Jadwal::where('guru_id', $guru->id)
                ->when($tahunAjaranId, fn($q) => $q->where('tahun_ajaran_id', $tahunAjaranId))
                ->with(['mapel', 'kelas'])
                ->get();

            $jadwalMapel = $jadwals->map(fn($j) => $j->mapel?->nama_mapel)->filter()->unique()->sort()->values();
            $jadwalKelas = $jadwals->map(fn($j) => $j->kelas?->nama_kelas)->filter()->unique()->sort()->values();

            // Build mapel-kelas pairs for the form
            $jadwalOptions = [
                'mapel' => $jadwalMapel,
                'kelas' => $jadwalKelas,
                'pairs' => $jadwals->map(fn($j) => [
                    'mapel' => $j->mapel?->nama_mapel,
                    'kelas' => $j->kelas?->nama_kelas,
                ])->filter(fn($p) => $p['mapel'] && $p['kelas'])->unique()->values(),
            ];
        } catch (\Exception $e) {
            $jadwalOptions = ['mapel' => [], 'kelas' => [], 'pairs' => []];
        }

        return response()->json([
            'success' => true,
            'data' => $moduls,
            'filters' => [
                'mapel' => $uniqueMapel,
                'kelas' => $uniqueKelas,
            ],
            'jadwal' => $jadwalOptions,
        ]);
    }

    /**
     * Detail modul ajar
     */
    public function show(Request $request, $id): JsonResponse
    {
        $guru = $request->user()->guru;
        $modul = ModulAjar::where('id', $id)->where('guru_id', $guru->id)->first();

        if (!$modul) {
            return response()->json(['error' => 'Modul tidak ditemukan'], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $this->formatModul($modul, true),
        ]);
    }

    /**
     * Buat modul ajar baru
     */
    public function store(Request $request): JsonResponse
    {
        $guru = $request->user()->guru;

        $validated = $request->validate([
            'mapel' => 'required|string|max:255',
            'kelas' => 'required|string|max:255',
            'fase' => 'nullable|string|max:10',
            'semester' => 'required|integer|in:1,2',
            'bab_materi' => 'required|string|max:255',
            'tanggal' => 'nullable|date',
            'alokasi_waktu' => 'nullable|string|max:255',
            'tujuan_pembelajaran' => 'required|string',
            'profil_pelajar' => 'nullable|array',
            'kegiatan_pendahuluan' => 'required|string',
            'kegiatan_inti' => 'required|string',
            'kegiatan_penutup' => 'required|string',
            'asesmen_formatif' => 'nullable|string',
            'asesmen_sumatif' => 'nullable|string',
            'media_sumber' => 'nullable|string',
        ]);

        $validated['guru_id'] = $guru->id;
        $validated['status'] = 'draft';

        $modul = ModulAjar::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Modul ajar berhasil dibuat',
            'data' => $this->formatModul($modul),
        ], 201);
    }

    /**
     * Update modul ajar (hanya jika draft)
     */
    public function update(Request $request, $id): JsonResponse
    {
        $guru = $request->user()->guru;
        $modul = ModulAjar::where('id', $id)->where('guru_id', $guru->id)->first();

        if (!$modul) {
            return response()->json(['error' => 'Modul tidak ditemukan'], 404);
        }

        if ($modul->isLocked()) {
            return response()->json(['error' => 'Modul sudah dikunci, buka kunci terlebih dahulu untuk mengedit'], 403);
        }

        $validated = $request->validate([
            'mapel' => 'sometimes|string|max:255',
            'kelas' => 'sometimes|string|max:255',
            'fase' => 'nullable|string|max:10',
            'semester' => 'sometimes|integer|in:1,2',
            'bab_materi' => 'sometimes|string|max:255',
            'tanggal' => 'nullable|date',
            'alokasi_waktu' => 'nullable|string|max:255',
            'tujuan_pembelajaran' => 'sometimes|string',
            'profil_pelajar' => 'nullable|array',
            'kegiatan_pendahuluan' => 'sometimes|string',
            'kegiatan_inti' => 'sometimes|string',
            'kegiatan_penutup' => 'sometimes|string',
            'asesmen_formatif' => 'nullable|string',
            'asesmen_sumatif' => 'nullable|string',
            'media_sumber' => 'nullable|string',
        ]);

        $modul->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Modul ajar berhasil diperbarui',
            'data' => $this->formatModul($modul->fresh()),
        ]);
    }

    /**
     * Hapus modul ajar (hanya jika draft)
     */
    public function destroy(Request $request, $id): JsonResponse
    {
        $guru = $request->user()->guru;
        $modul = ModulAjar::where('id', $id)->where('guru_id', $guru->id)->first();

        if (!$modul) {
            return response()->json(['error' => 'Modul tidak ditemukan'], 404);
        }

        if ($modul->isLocked()) {
            return response()->json(['error' => 'Modul sudah dikunci, tidak bisa dihapus'], 403);
        }

        $modul->delete();

        return response()->json([
            'success' => true,
            'message' => 'Modul ajar berhasil dihapus',
        ]);
    }

    /**
     * Kunci modul ajar
     */
    public function lock(Request $request, $id): JsonResponse
    {
        $guru = $request->user()->guru;
        $modul = ModulAjar::where('id', $id)->where('guru_id', $guru->id)->first();

        if (!$modul) {
            return response()->json(['error' => 'Modul tidak ditemukan'], 404);
        }

        if ($modul->isLocked()) {
            return response()->json(['error' => 'Modul sudah dikunci'], 400);
        }

        $modul->update([
            'status' => 'locked',
            'locked_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Modul ajar berhasil dikunci',
            'data' => $this->formatModul($modul->fresh()),
        ]);
    }

    /**
     * Buka kunci modul ajar (locked → draft)
     */
    public function unlock(Request $request, $id): JsonResponse
    {
        $guru = $request->user()->guru;
        $modul = ModulAjar::where('id', $id)->where('guru_id', $guru->id)->first();

        if (!$modul) {
            return response()->json(['error' => 'Modul tidak ditemukan'], 404);
        }

        if ($modul->isDraft()) {
            return response()->json(['error' => 'Modul sudah dalam status draft'], 400);
        }

        $modul->update([
            'status' => 'draft',
            'locked_at' => null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Modul ajar berhasil dibuka kuncinya',
            'data' => $this->formatModul($modul->fresh()),
        ]);
    }

    /**
     * Duplikat modul ajar → draft baru
     */
    public function duplicate(Request $request, $id): JsonResponse
    {
        $guru = $request->user()->guru;
        $modul = ModulAjar::where('id', $id)->where('guru_id', $guru->id)->first();

        if (!$modul) {
            return response()->json(['error' => 'Modul tidak ditemukan'], 404);
        }

        $newModul = $modul->replicate();
        $newModul->status = 'draft';
        $newModul->locked_at = null;
        $newModul->duplicated_from = $modul->id;
        $newModul->bab_materi = $modul->bab_materi . ' (Salinan)';
        $newModul->save();

        return response()->json([
            'success' => true,
            'message' => 'Modul ajar berhasil diduplikat',
            'data' => $this->formatModul($newModul),
        ], 201);
    }

    /**
     * Generate modul ajar content using Gemini AI
     */
    public function generateAI(Request $request): JsonResponse
    {
        $request->validate([
            'mapel' => 'required|string',
            'kelas' => 'required|string',
            'bab_materi' => 'required|string',
            'semester' => 'sometimes|integer|in:1,2',
            'fase' => 'nullable|string',
            'kurikulum' => 'sometimes|string|in:kumer,kbc,kolaborasi',
        ]);

        $apiKey = AppSetting::getValue('gemini_api_key');
        $apiKey2 = AppSetting::getValue('gemini_api_key_2');
        if (!$apiKey && !$apiKey2) {
            return response()->json(['error' => 'API Key Gemini belum dikonfigurasi di pengaturan'], 422);
        }
        $apiKeys = array_filter([$apiKey, $apiKey2]);

        $mapel = $request->mapel;
        $kelas = $request->kelas;
        $bab = $request->bab_materi;
        $semester = $request->semester ?? 1;
        $fase = $request->fase ?? '';
        $kurikulum = $request->kurikulum ?? 'kolaborasi';

        // Dinamis berdasarkan pilihan kurikulum
        $kurikulumDesc = match ($kurikulum) {
            'kumer' => 'Kurikulum Merdeka. Fokus pada Profil Pelajar Pancasila, pembelajaran berdiferensiasi, dan capaian pembelajaran (CP). Gunakan pendekatan Teaching at the Right Level (TaRL) dan asesmen yang bervariasi.',
            'kbc' => 'Kurikulum Berbasis Cinta (KBC). Fokus pada pendidikan karakter berbasis cinta, kasih sayang (rahmah), keteladanan, dan pembentukan akhlak mulia. Integrasikan nilai-nilai cinta kepada Allah, Rasul, sesama, dan lingkungan dalam setiap kegiatan.',
            'kolaborasi' => 'Kolaborasi Kurikulum Merdeka dan Kurikulum Berbasis Cinta (KBC). Gabungkan pendekatan Profil Pelajar Pancasila dan pembelajaran berdiferensiasi dari Kurikulum Merdeka dengan nilai-nilai cinta, kasih sayang, dan pembentukan akhlak mulia dari KBC.',
            default => 'Kurikulum Merdeka',
        };

        // Profil/Pilar options based on kurikulum
        $profilExample = match ($kurikulum) {
            'kbc' => '["cinta_allah","cinta_ilmu","cinta_sesama","cinta_alam","cinta_tanah_air"]',
            'kolaborasi' => '["beriman","bernalar","cinta_allah","cinta_ilmu"]',
            default => '["beriman","berkebinekaan","bernalar","mandiri","gotong_royong","kreatif"]',
        };

        $profilInstruction = match ($kurikulum) {
            'kbc' => 'Pilih 2-4 pilar cinta yang paling relevan dari: cinta_allah, cinta_ilmu, cinta_sesama, cinta_alam, cinta_tanah_air',
            'kolaborasi' => 'Pilih 3-5 gabungan profil pelajar dan pilar cinta dari: beriman, berkebinekaan, bernalar, mandiri, gotong_royong, kreatif, cinta_allah, cinta_ilmu, cinta_sesama, cinta_alam, cinta_tanah_air',
            default => 'Pilih 2-4 profil pelajar yang paling relevan dari: beriman, berkebinekaan, bernalar, mandiri, gotong_royong, kreatif',
        };

        $prompt = <<<EOT
Kamu adalah ahli pendidikan di Indonesia. Buatkan konten Modul Ajar berbasis {$kurikulumDesc}

Detail Modul:
- Mata Pelajaran: {$mapel}
- Kelas: {$kelas}
- Fase: {$fase}
- Semester: {$semester}
- Bab/Materi Pokok: {$bab}

Berikan respons HANYA dalam format JSON (tanpa markdown, tanpa komentar) dengan struktur berikut:
{
  "tujuan_pembelajaran": "tujuan pembelajaran yang spesifik dan terukur sesuai materi",
  "profil_pelajar": {$profilExample},
  "kegiatan_pendahuluan": "1. Langkah pertama\n2. Langkah kedua\n3. Langkah ketiga",
  "kegiatan_inti": "1. Langkah pertama\n   a. Sub langkah\n   b. Sub langkah\n2. Langkah kedua",
  "kegiatan_penutup": "1. Langkah pertama\n2. Langkah kedua",
  "asesmen_formatif": "teknik asesmen formatif yang sesuai",
  "asesmen_sumatif": "teknik asesmen sumatif yang sesuai",
  "media_sumber": "media dan sumber belajar yang relevan"
}

Pastikan:
1. Konten harus relevan dengan mata pelajaran {$mapel} dan materi {$bab}
2. Sesuaikan dengan tingkat kelas {$kelas}
3. {$profilInstruction}
4. PENTING: Setiap langkah kegiatan HARUS dipisah dengan newline (\n). Satu nomor = satu baris
5. Sub-langkah (a, b, c) harus diawali dengan 3 spasi sebelum huruf agar menjorok
6. Contoh format kegiatan: "1. Guru membuka pelajaran\n2. Siswa mengamati\n   a. Mengamati gambar\n   b. Mencatat poin penting\n3. Diskusi kelompok"
7. Gunakan bahasa Indonesia yang baik dan formal
8. JANGAN gunakan format markdown seperti **bold** atau *italic* - tulis teks biasa saja
9. Jawab HANYA JSON, tanpa teks lain
EOT;

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
                    'temperature' => 0.7,
                    'maxOutputTokens' => 4096,
                ],
            ];

            // Build list of keys to try: primary first, then backup (same pattern as AiController)
            $models = ['gemini-2.5-flash', 'gemini-2.0-flash'];
            $response = null;

            foreach ($apiKeys as $key) {
                foreach ($models as $model) {
                    $response = \Illuminate\Support\Facades\Http::withoutVerifying()->timeout(30)->post(
                        "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$key}",
                        $payload
                    );

                    if ($response->status() !== 429) {
                        break 2; // Success or other error, stop all loops
                    }

                    \Log::warning("Gemini model {$model} rate limited, trying next...");
                }
                \Log::warning("All models rate limited for key, trying backup key...");
            }

            if (!$response->successful()) {
                $message = 'Gagal menghubungi Gemini AI: ' . $response->status();
                if ($response->status() === 429) {
                    $message = 'Kuota API Gemini habis. Tunggu 1-2 menit lalu coba lagi.';
                }
                return response()->json(['error' => $message], 500);
            }

            $result = $response->json();
            $text = $result['candidates'][0]['content']['parts'][0]['text'] ?? '';
            $text = trim($text);

            if (empty($text)) {
                \Log::error('Gemini AI: empty response', ['result' => json_encode($result)]);
                return response()->json(['error' => 'AI tidak menghasilkan output. Silakan coba lagi.'], 500);
            }

            // Parse JSON from response — remove markdown code blocks if wrapped
            if (str_starts_with($text, '```')) {
                $text = preg_replace('/^```(?:json)?\n?/', '', $text);
                $text = preg_replace('/\n?```$/', '', $text);
                $text = trim($text);
            }

            // Try to extract JSON object from text
            if (!str_starts_with($text, '{')) {
                if (preg_match('/\{[\s\S]*\}/', $text, $matches)) {
                    $text = $matches[0];
                }
            }

            $generated = json_decode($text, true);
            if (!$generated) {
                \Log::error('Gemini AI: JSON decode failed', ['text' => substr($text, 0, 500)]);
                return response()->json(['error' => 'Gagal memproses respons AI. Coba lagi.'], 500);
            }

            return response()->json([
                'success' => true,
                'data' => $generated,
            ]);
        } catch (\Exception $e) {
            \Log::error('Gemini AI exception: ' . $e->getMessage());
            return response()->json(['error' => 'Gagal menghubungi AI: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Export modul ajar sebagai halaman cetak (Blade + kop + QR)
     */
    public function exportPdf(Request $request, $id)
    {
        $guru = $request->user()->guru;
        $modul = ModulAjar::where('id', $id)->where('guru_id', $guru->id)->first();

        if (!$modul) {
            return response()->json(['error' => 'Modul tidak ditemukan'], 404);
        }

        // Get institution data
        $namaLembaga = AppSetting::getValue('nama_lembaga') ?? 'Madrasah';
        $kopUrl = null;
        $kopSetting = AppSetting::getValue('kop_surat');
        if ($kopSetting) {
            // kop_surat may be stored as json (array) or plain string
            $kopPath = is_array($kopSetting) ? ($kopSetting['path'] ?? ($kopSetting[0] ?? null)) : $kopSetting;
            if ($kopPath) {
                $kopUrl = asset('storage/' . $kopPath);
            }
        }

        // Get Kepala Sekolah
        $kepala = PrintService::getKepalaSekolah();

        // Generate QR Code
        $qrData = null;
        try {
            $qrData = PrintService::createVerification(
                'Modul Ajar',
                "Modul Ajar: {$modul->mapel} - {$modul->bab_materi}",
                $modul->locked_at ? $modul->locked_at->toDateString() : now()->toDateString(),
                [
                    'guru' => $guru->nama,
                    'mapel' => $modul->mapel,
                    'kelas' => $modul->kelas,
                    'bab' => $modul->bab_materi,
                ]
            );
        } catch (\Exception $e) {
            \Log::warning('QR generation for modul ajar failed: ' . $e->getMessage());
        }

        // Profil Pelajar Pancasila labels
        $profilLabels = [
            'beriman' => 'Beriman, Bertakwa, dan Berakhlak Mulia',
            'berkebinekaan' => 'Berkebinekaan Global',
            'bernalar' => 'Bernalar Kritis',
            'mandiri' => 'Mandiri',
            'gotong_royong' => 'Bergotong Royong',
            'kreatif' => 'Kreatif',
            // KBC Pilar Cinta
            'cinta_allah' => 'Cinta kepada Allah',
            'cinta_ilmu' => 'Cinta kepada Ilmu',
            'cinta_sesama' => 'Cinta kepada Diri Sendiri & Sesama',
            'cinta_alam' => 'Cinta kepada Alam/Lingkungan',
            'cinta_tanah_air' => 'Cinta kepada Tanah Air',
        ];

        // Use modul's tanggal or fallback to current date
        $tanggalModul = $modul->tanggal ? Carbon::parse($modul->tanggal) : Carbon::now();
        $tanggalCetak = $tanggalModul->locale('id')->translatedFormat('d F Y');
        $alamatFull = AppSetting::getValue('alamat_lembaga') ?? 'Pekalongan';
        // Extract city name (last part after comma, or full string)
        $parts = array_map('trim', explode(',', $alamatFull));
        $kota = end($parts) ?: 'Pekalongan';

        return view('print.modul-ajar', [
            'modul' => $modul,
            'guru' => $guru,
            'kopUrl' => $kopUrl,
            'namaLembaga' => $namaLembaga,
            'kepala' => $kepala,
            'qrCode' => $qrData ? $qrData['qrCode'] : null,
            'profilLabels' => $profilLabels,
            'tanggalCetak' => $tanggalCetak,
            'alamat' => $kota,
        ]);
    }

    /**
     * Admin: List modul by guru ID
     */
    public static function modulByGuru(Request $request, $guruId): JsonResponse
    {
        $moduls = ModulAjar::where('guru_id', $guruId)
            ->orderBy('updated_at', 'desc')
            ->get()
            ->map(fn($m) => [
                'id' => $m->id,
                'mapel' => $m->mapel,
                'kelas' => $m->kelas,
                'fase' => $m->fase,
                'semester' => $m->semester,
                'bab_materi' => $m->bab_materi,
                'status' => $m->status,
                'locked_at' => $m->locked_at?->translatedFormat('d M Y'),
                'created_at' => $m->created_at->translatedFormat('d M Y'),
            ]);

        return response()->json([
            'success' => true,
            'data' => $moduls,
        ]);
    }

    // ── Helpers ──

    private function formatModul(ModulAjar $modul, bool $full = false): array
    {
        $data = [
            'id' => $modul->id,
            'mapel' => $modul->mapel,
            'kelas' => $modul->kelas,
            'fase' => $modul->fase,
            'semester' => $modul->semester,
            'bab_materi' => $modul->bab_materi,
            'tanggal' => $modul->tanggal,
            'alokasi_waktu' => $modul->alokasi_waktu,
            'status' => $modul->status,
            'locked_at' => $modul->locked_at?->translatedFormat('d M Y, H:i'),
            'duplicated_from' => $modul->duplicated_from,
            'created_at' => $modul->created_at->translatedFormat('d M Y'),
            'updated_at' => $modul->updated_at->translatedFormat('d M Y, H:i'),
        ];

        if ($full) {
            $data += [
                'tujuan_pembelajaran' => $modul->tujuan_pembelajaran,
                'profil_pelajar' => $modul->profil_pelajar ?? [],
                'kegiatan_pendahuluan' => $modul->kegiatan_pendahuluan,
                'kegiatan_inti' => $modul->kegiatan_inti,
                'kegiatan_penutup' => $modul->kegiatan_penutup,
                'asesmen_formatif' => $modul->asesmen_formatif,
                'asesmen_sumatif' => $modul->asesmen_sumatif,
                'media_sumber' => $modul->media_sumber,
            ];
        }

        return $data;
    }
}
