<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Supervisi;
use App\Models\TahunAjaran;
use App\Models\Kelas;
use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class SupervisiController extends Controller
{
    private function getActiveTahunAjaranId(Request $request): ?int
    {
        $user = $request->user();
        if ($user && $user->tahun_ajaran_id) {
            return $user->tahun_ajaran_id;
        }
        $current = TahunAjaran::where('is_active', true)->first();
        return $current ? $current->id : null;
    }

    public function index(Request $request): JsonResponse
    {
        $tahunAjaranId = $request->query('tahun_ajaran_id') ?? $this->getActiveTahunAjaranId($request);

        $query = Supervisi::with([
            'supervisor:id,nama,nip,jabatan',
            'guru:id,nama,nip,jabatan',
            'mapel:id,nama_mapel',
            'tahunAjaran:id,nama',
        ]);

        if ($tahunAjaranId) {
            $query->where('tahun_ajaran_id', $tahunAjaranId);
        }

        $data = $query->orderBy('tanggal', 'desc')->get();

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'supervisor_id' => 'required|exists:guru,id',
            'guru_id' => 'required|exists:guru,id',
            'mapel_id' => 'required|exists:mapel,id',
            'tanggal' => 'required|date',
            'catatan' => 'nullable|string',
            'hasil_supervisi' => 'nullable|array',
            'status' => 'nullable|in:dijadwalkan,selesai',
            'tahun_ajaran_id' => 'nullable|exists:tahun_ajaran,id',
            'kelas_id' => 'nullable|exists:kelas,id',
        ]);

        // Resolve kelas_id to kelas name string
        if (!empty($validated['kelas_id'])) {
            $kelas = Kelas::find($validated['kelas_id']);
            $validated['kelas'] = $kelas ? $kelas->nama_kelas : null;
        }
        unset($validated['kelas_id']);

        if (empty($validated['tahun_ajaran_id'])) {
            $validated['tahun_ajaran_id'] = $this->getActiveTahunAjaranId($request);
        }

        $validated['status'] = $validated['status'] ?? 'dijadwalkan';

        $supervisi = Supervisi::create($validated);

        ActivityLog::logCreate($supervisi, "Menambahkan jadwal supervisi");

        return response()->json([
            'success' => true,
            'message' => 'Jadwal supervisi berhasil ditambahkan',
            'data' => $supervisi->load(['supervisor:id,nama', 'guru:id,nama', 'mapel:id,nama_mapel']),
        ], 201);
    }

    public function show(Supervisi $supervisi): JsonResponse
    {
        $supervisi->load([
            'supervisor:id,nama,nip,jabatan',
            'guru:id,nama,nip,jabatan',
            'mapel:id,nama_mapel',
            'tahunAjaran:id,nama',
        ]);

        return response()->json([
            'success' => true,
            'data' => $supervisi,
        ]);
    }

    public function update(Request $request, Supervisi $supervisi): JsonResponse
    {
        $validated = $request->validate([
            'supervisor_id' => 'required|exists:guru,id',
            'guru_id' => 'required|exists:guru,id',
            'mapel_id' => 'required|exists:mapel,id',
            'tanggal' => 'required|date',
            'catatan' => 'nullable|string',
            'hasil_supervisi' => 'nullable|array',
            'status' => 'nullable|in:dijadwalkan,selesai',
            'tahun_ajaran_id' => 'nullable|exists:tahun_ajaran,id',
            'kelas_id' => 'nullable|exists:kelas,id',
        ]);

        // Resolve kelas_id to kelas name string
        if (!empty($validated['kelas_id'])) {
            $kelas = Kelas::find($validated['kelas_id']);
            $validated['kelas'] = $kelas ? $kelas->nama_kelas : null;
        }
        unset($validated['kelas_id']);

        // Ensure tahun_ajaran_id is preserved
        if (empty($validated['tahun_ajaran_id'])) {
            $validated['tahun_ajaran_id'] = $supervisi->tahun_ajaran_id ?? $this->getActiveTahunAjaranId($request);
        }

        $oldValues = $supervisi->getOriginal();
        $supervisi->update($validated);

        ActivityLog::logUpdate($supervisi, $oldValues, "Mengubah supervisi");

        return response()->json([
            'success' => true,
            'message' => 'Supervisi berhasil diperbarui',
            'data' => $supervisi->load(['supervisor:id,nama', 'guru:id,nama', 'mapel:id,nama_mapel']),
        ]);
    }

    public function destroy(Supervisi $supervisi): JsonResponse
    {
        ActivityLog::logDelete($supervisi, "Menghapus supervisi");
        $supervisi->delete();

        return response()->json([
            'success' => true,
            'message' => 'Supervisi berhasil dihapus',
        ]);
    }

    public function bulkDelete(Request $request): JsonResponse
    {
        $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'exists:supervisi,id',
        ]);

        $items = Supervisi::whereIn('id', $request->ids)->get();
        foreach ($items as $item) {
            ActivityLog::logDelete($item, "Menghapus supervisi (bulk)");
        }

        Supervisi::whereIn('id', $request->ids)->delete();

        return response()->json([
            'success' => true,
            'message' => count($request->ids) . ' data supervisi berhasil dihapus',
        ]);
    }

    public function submitHasil(Request $request, Supervisi $supervisi): JsonResponse
    {
        $validated = $request->validate([
            'kelas' => 'required|string|max:100',
            'topik' => 'required|string|max:255',
            'hasil_supervisi' => 'required|array',
            'hasil_supervisi.bagian_a' => 'required|array',
            'hasil_supervisi.bagian_b' => 'required|array',
            'dokumentasi' => 'required|array|min:2',
            'dokumentasi.*' => 'required|string',
        ]);

        $oldValues = $supervisi->getOriginal();

        $supervisi->update([
            'kelas' => $validated['kelas'],
            'topik' => $validated['topik'],
            'hasil_supervisi' => $validated['hasil_supervisi'],
            'dokumentasi' => $validated['dokumentasi'],
            'status' => 'selesai',
        ]);

        ActivityLog::logUpdate($supervisi, $oldValues, "Mengisi hasil supervisi");

        return response()->json([
            'success' => true,
            'message' => 'Hasil supervisi berhasil disimpan',
            'data' => $supervisi->load(['supervisor:id,nama', 'guru:id,nama', 'mapel:id,nama_mapel']),
        ]);
    }

    public function print(Supervisi $supervisi): JsonResponse
    {
        $supervisi->load([
            'supervisor:id,nama,nip,jabatan',
            'guru:id,nama,nip,jabatan',
            'mapel:id,nama_mapel',
            'tahunAjaran:id,nama',
        ]);

        return response()->json([
            'success' => true,
            'data' => $supervisi,
        ]);
    }

    /**
     * Print Supervisi Report (Blade template with kop, QR, dokumentasi)
     */
    public function printSupervisi(Request $request, Supervisi $supervisi)
    {
        $supervisi->load([
            'supervisor:id,nama,nip,jabatan',
            'guru:id,nama,nip,jabatan',
            'mapel:id,nama_mapel',
            'tahunAjaran:id,nama',
        ]);

        $hasil = $supervisi->hasil_supervisi ?? [];
        $hasilA = $hasil['bagian_a'] ?? [];
        $hasilB = $hasil['bagian_b'] ?? [];

        // Assessment criteria (mirrored from frontend)
        $bagianA = [
            ['key' => 'a1', 'label' => 'Kelengkapan Komponen Minimum', 'desc' => 'Modul ajar memuat Tujuan Pembelajaran, Langkah Pembelajaran, Rencana Asesmen, dan Media Pembelajaran.'],
            ['key' => 'a2', 'label' => 'Kesesuaian dengan Karakteristik Siswa', 'desc' => 'Modul ajar dirancang sesuai kesiapan belajar, minat, dan tingkat penguasaan peserta didik.'],
            ['key' => 'a3', 'label' => 'Kualitas Penyajian Materi', 'desc' => 'Modul ajar disusun secara fleksibel, jelas, sederhana, esensial, menarik, dan kontekstual.'],
            ['key' => 'a4', 'label' => 'Instrumen Asesmen Terukur', 'desc' => 'Terdapat instrumen dan rubrik penilaian yang jelas untuk mengukur ketercapaian tujuan pembelajaran.'],
        ];
        $bagianB = [
            ['key' => 'b1', 'label' => 'Pembelajaran Berdiferensiasi', 'desc' => 'Pelaksanaan mengakomodasi kebutuhan belajar siswa serta memberikan scaffolding atau tantangan yang tepat.'],
            ['key' => 'b2', 'label' => 'Keterlibatan & Interaksi Aktif', 'desc' => 'Pendidik aktif mendengarkan, memberikan pertanyaan terbuka, serta melibatkan siswa dalam kolaborasi.'],
            ['key' => 'b3', 'label' => 'Pemberian Umpan Balik', 'desc' => 'Terdapat umpan balik konstruktif dari guru ke siswa, serta kesempatan refleksi diri dan umpan balik antar-teman.'],
            ['key' => 'b4', 'label' => 'Pengembangan Karakter', 'desc' => 'Pendidik menjadi teladan, membangun kesepakatan kelas, dan mengintegrasikan nilai-nilai Profil Pelajar Pancasila.'],
            ['key' => 'b5', 'label' => 'Lingkungan Belajar Aman & Bahagia', 'desc' => 'Proses belajar menumbuhkan rasa bahagia, aman, dan nyaman bagi peserta didik secara holistik.'],
        ];

        // Calculate averages
        $sumA = 0;
        $countA = 0;
        foreach ($bagianA as $item) {
            if (isset($hasilA[$item['key']])) {
                $sumA += (int) $hasilA[$item['key']];
                $countA++;
            }
        }
        $rataA = $countA > 0 ? round($sumA / $countA, 2) : 0;

        $sumB = 0;
        $countB = 0;
        foreach ($bagianB as $item) {
            if (isset($hasilB[$item['key']])) {
                $sumB += (int) $hasilB[$item['key']];
                $countB++;
            }
        }
        $rataB = $countB > 0 ? round($sumB / $countB, 2) : 0;

        $rataTotal = ($countA + $countB) > 0 ? round(($sumA + $sumB) / ($countA + $countB), 2) : 0;

        // Determine predikat
        if ($rataTotal >= 3.5) {
            $predikat = 'Sangat Baik';
        } elseif ($rataTotal >= 2.5) {
            $predikat = 'Baik';
        } elseif ($rataTotal >= 1.5) {
            $predikat = 'Cukup';
        } else {
            $predikat = 'Kurang';
        }

        // Handle photos
        $fotos = [];
        $dokumentasi = $supervisi->dokumentasi ?? [];
        foreach ($dokumentasi as $foto) {
            if (is_string($foto) && strpos($foto, 'data:image') === 0) {
                $fotos[] = $foto;
            } elseif (is_string($foto)) {
                $fotos[] = asset('storage/' . $foto);
            }
        }

        // Generate Kesimpulan & Tindak Lanjut per-item
        $allItems = array_merge(
            array_map(fn($i) => array_merge($i, ['bagian' => 'Perencanaan Pembelajaran', 'skor' => (int) ($hasilA[$i['key']] ?? 0)]), $bagianA),
            array_map(fn($i) => array_merge($i, ['bagian' => 'Pelaksanaan Pembelajaran', 'skor' => (int) ($hasilB[$i['key']] ?? 0)]), $bagianB)
        );

        $kelebihan = [];
        $kelemahan = [];
        $tindakLanjut = [4 => [], 3 => [], 2 => [], 1 => []];

        $skorKesimpulan = [
            4 => 'sudah sangat baik',
            3 => 'sudah baik',
            2 => 'masih cukup dan perlu ditingkatkan',
            1 => 'belum tampak dan perlu perhatian khusus',
        ];
        $skorTindakLanjut = [
            4 => 'Pertahankan dan tingkatkan',
            3 => 'Pertahankan dan kembangkan lebih lanjut',
            2 => 'Perlu bimbingan dan pendampingan untuk perbaikan',
            1 => 'Perlu pembinaan intensif dan pendampingan khusus',
        ];

        foreach ($allItems as $item) {
            $skor = $item['skor'];
            if ($skor <= 0)
                continue;

            $text = $item['label'] . ' ' . $skorKesimpulan[$skor];
            if ($skor >= 3) {
                $kelebihan[] = $text;
            } else {
                $kelemahan[] = $text;
            }
            $tindakLanjut[$skor][] = $item['label'];
        }

        // Generate QR codes
        $qrGuruData = \App\Services\PrintService::createVerification(
            'Instrumen Supervisi',
            'Supervisi ' . ($supervisi->guru->nama ?? '-'),
            $supervisi->tanggal?->toDateString() ?? now()->toDateString(),
            ['guru' => $supervisi->guru->nama ?? '-', 'mapel' => $supervisi->mapel->nama_mapel ?? '-']
        );

        $qrSupervisorData = \App\Services\PrintService::createVerification(
            'Instrumen Supervisi',
            'Supervisi oleh ' . ($supervisi->supervisor->nama ?? '-'),
            $supervisi->tanggal?->toDateString() ?? now()->toDateString(),
            ['supervisor' => $supervisi->supervisor->nama ?? '-', 'kelas' => $supervisi->kelas ?? '-']
        );

        return view('print.hasil-supervisi', [
            'kopUrl' => \App\Services\PrintService::getKopUrl(),
            'guru' => $supervisi->guru,
            'supervisor' => $supervisi->supervisor,
            'mapel' => $supervisi->mapel->nama_mapel ?? '-',
            'kelas' => $supervisi->kelas ?? '-',
            'topik' => $supervisi->topik ?? '-',
            'tanggalSupervisi' => \App\Services\PrintService::formatDate($supervisi->tanggal),
            'bagianA' => $bagianA,
            'bagianB' => $bagianB,
            'hasilA' => $hasilA,
            'hasilB' => $hasilB,
            'rataA' => $rataA,
            'rataB' => $rataB,
            'rataTotal' => $rataTotal,
            'predikat' => $predikat,
            'kelebihan' => $kelebihan,
            'kelemahan' => $kelemahan,
            'tindakLanjut' => $tindakLanjut,
            'skorTindakLanjut' => $skorTindakLanjut,
            'catatan' => $supervisi->catatan,
            'fotos' => $fotos,
            'tanggalCetak' => \App\Services\PrintService::formatDate(now()),
            'qrGuru' => $qrGuruData['qrCode'],
            'qrSupervisor' => $qrSupervisorData['qrCode'],
        ]);
    }
}
