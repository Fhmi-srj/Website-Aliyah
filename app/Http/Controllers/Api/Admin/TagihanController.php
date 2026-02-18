<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Tagihan;
use App\Models\TagihanSiswa;
use App\Models\Siswa;
use App\Models\Kelas;
use App\Models\SiswaKelas;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class TagihanController extends Controller
{
    /**
     * List all tagihan for active tahun ajaran.
     */
    public function index(Request $request): JsonResponse
    {
        $tahunAjaranId = $request->user()->tahun_ajaran_id;

        $tagihan = Tagihan::where('tahun_ajaran_id', $tahunAjaranId)
            ->withCount('tagihanSiswa')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json(['success' => true, 'data' => $tagihan]);
    }

    /**
     * Create a new tagihan (just name/type).
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nama' => 'required|string|max:255',
            'tanggal_jatuh_tempo' => 'nullable|date',
        ]);

        $validated['tahun_ajaran_id'] = $request->user()->tahun_ajaran_id;
        $tagihan = Tagihan::create($validated);

        ActivityLog::logCreate($tagihan, "Menambahkan jenis tagihan: {$tagihan->nama}");

        return response()->json([
            'success' => true,
            'message' => 'Jenis tagihan berhasil dibuat',
            'data' => $tagihan,
        ], 201);
    }

    /**
     * Update a tagihan name.
     */
    public function update(Request $request, $id): JsonResponse
    {
        $tagihan = Tagihan::findOrFail($id);
        $oldValues = $tagihan->toArray();

        $validated = $request->validate([
            'nama' => 'sometimes|string|max:255',
            'tanggal_jatuh_tempo' => 'nullable|date',
        ]);

        $tagihan->update($validated);
        ActivityLog::logUpdate($tagihan, $oldValues, "Mengubah tagihan: {$tagihan->nama}");

        return response()->json([
            'success' => true,
            'message' => 'Tagihan berhasil diperbarui',
            'data' => $tagihan->fresh(),
        ]);
    }

    /**
     * Delete a tagihan.
     */
    public function destroy($id): JsonResponse
    {
        $tagihan = Tagihan::findOrFail($id);
        ActivityLog::logDelete($tagihan, "Menghapus tagihan: {$tagihan->nama}");
        $tagihan->delete();

        return response()->json(['success' => true, 'message' => 'Tagihan berhasil dihapus']);
    }

    /**
     * Get siswa x tagihan grid for the Input Tagihan tab.
     * Returns: siswa grouped by kelas, each with nominal per tagihan.
     */
    public function siswaGrid(Request $request): JsonResponse
    {
        $tahunAjaranId = $request->user()->tahun_ajaran_id;
        $kelasId = $request->query('kelas_id');

        $tagihan = Tagihan::where('tahun_ajaran_id', $tahunAjaranId)
            ->orderBy('created_at')
            ->get(['id', 'nama', 'tanggal_jatuh_tempo']);

        // Get siswa with their kelas
        $query = SiswaKelas::where('tahun_ajaran_id', $tahunAjaranId)
            ->whereIn('status', ['Aktif', 'Naik', 'Tinggal']);

        if ($kelasId) {
            $query->where('kelas_id', $kelasId);
        }

        $siswaKelas = $query->with(['siswa:id,nama,nis', 'kelas:id,nama_kelas'])->get();

        // Get all tagihan_siswa records for these students
        $siswaIds = $siswaKelas->pluck('siswa_id')->unique();
        $tagihanSiswa = TagihanSiswa::whereIn('siswa_id', $siswaIds)
            ->whereIn('tagihan_id', $tagihan->pluck('id'))
            ->get()
            ->groupBy(fn($ts) => $ts->siswa_id . '_' . $ts->tagihan_id);

        $rows = $siswaKelas->map(function ($sk) use ($tagihan, $tagihanSiswa) {
            $tagihanData = [];
            foreach ($tagihan as $t) {
                $key = $sk->siswa_id . '_' . $t->id;
                $ts = $tagihanSiswa->get($key)?->first();
                $tagihanData[$t->id] = [
                    'tagihan_siswa_id' => $ts?->id,
                    'nominal' => $ts?->nominal ?? 0,
                    'total_dibayar' => $ts ? $ts->total_dibayar : 0,
                    'status' => $ts ? $ts->status : 'belum',
                ];
            }
            return [
                'siswa_id' => $sk->siswa_id,
                'siswa_nama' => $sk->siswa->nama ?? '-',
                'siswa_nis' => $sk->siswa->nis ?? '-',
                'kelas_id' => $sk->kelas_id,
                'kelas_nama' => $sk->kelas->nama_kelas ?? '-',
                'tagihan' => $tagihanData,
            ];
        });

        // Get kelas list
        $kelasList = Kelas::whereIn('id', $siswaKelas->pluck('kelas_id')->unique())
            ->orderBy('nama_kelas')
            ->get(['id', 'nama_kelas as nama']);

        return response()->json([
            'success' => true,
            'data' => [
                'tagihan' => $tagihan,
                'kelas' => $kelasList,
                'siswa' => $rows->sortBy('siswa_nama')->values(),
            ],
        ]);
    }

    /**
     * Assign tagihan to siswa or update nominal. Supports bulk per kelas.
     */
    public function assignSiswa(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'tagihan_id' => 'required|exists:tagihan,id',
            'items' => 'required|array',
            'items.*.siswa_id' => 'required|exists:siswa,id',
            'items.*.kelas_id' => 'required|exists:kelas,id',
            'items.*.nominal' => 'required|numeric|min:0',
        ]);

        $count = 0;
        foreach ($validated['items'] as $item) {
            TagihanSiswa::updateOrCreate(
                [
                    'siswa_id' => $item['siswa_id'],
                    'tagihan_id' => $validated['tagihan_id'],
                ],
                [
                    'kelas_id' => $item['kelas_id'],
                    'nominal' => $item['nominal'],
                ]
            );
            $count++;
        }

        ActivityLog::log('update', null, "Assign/update nominal tagihan ID {$validated['tagihan_id']} untuk {$count} siswa");

        return response()->json([
            'success' => true,
            'message' => "{$count} siswa berhasil di-update",
        ]);
    }

    /**
     * Bulk update nominal for all siswa in one or more kelas for one or more tagihan.
     */
    public function bulkNominal(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'tagihan_ids' => 'required|array|min:1',
            'tagihan_ids.*' => 'exists:tagihan,id',
            'kelas_ids' => 'required|array|min:1',
            'kelas_ids.*' => 'exists:kelas,id',
            'nominal' => 'required|numeric|min:0',
        ]);

        $tahunAjaranId = $request->user()->tahun_ajaran_id;

        $totalCount = 0;
        $kelasNames = [];
        $tagihanNames = [];

        foreach ($validated['tagihan_ids'] as $tagihanId) {
            $tagihan = Tagihan::find($tagihanId);
            if ($tagihan && !in_array($tagihan->nama, $tagihanNames)) {
                $tagihanNames[] = $tagihan->nama;
            }

            foreach ($validated['kelas_ids'] as $kelasId) {
                $siswaKelas = SiswaKelas::where('tahun_ajaran_id', $tahunAjaranId)
                    ->where('kelas_id', $kelasId)
                    ->whereIn('status', ['Aktif', 'Naik', 'Tinggal'])
                    ->get();

                foreach ($siswaKelas as $sk) {
                    TagihanSiswa::updateOrCreate(
                        [
                            'siswa_id' => $sk->siswa_id,
                            'tagihan_id' => $tagihanId,
                        ],
                        [
                            'kelas_id' => $kelasId,
                            'nominal' => $validated['nominal'],
                        ]
                    );
                    $totalCount++;
                }

                $kelas = Kelas::find($kelasId);
                if ($kelas && !in_array($kelas->nama_kelas, $kelasNames)) {
                    $kelasNames[] = $kelas->nama_kelas;
                }
            }
        }

        $kelasLabel = implode(', ', $kelasNames);
        $tagihanLabel = implode(', ', $tagihanNames);
        $firstTagihan = Tagihan::find($validated['tagihan_ids'][0]);
        ActivityLog::log('update', $firstTagihan, "Bulk set nominal tagihan '{$tagihanLabel}' untuk {$totalCount} siswa kelas {$kelasLabel}");

        return response()->json([
            'success' => true,
            'message' => "Nominal {$totalCount} record ({$tagihanLabel}) di kelas {$kelasLabel} berhasil diperbarui",
        ]);
    }

    /**
     * Export tagihan to PDF.
     */
    public function exportPdf(Request $request, $id)
    {
        $tagihan = Tagihan::findOrFail($id);
        $tagihanSiswa = TagihanSiswa::where('tagihan_id', $id)
            ->with(['siswa:id,nama,nis', 'kelas:id,nama_kelas', 'pembayaran'])
            ->orderBy('kelas_id')
            ->orderBy('siswa_id')
            ->get();

        $html = view('exports.tagihan-pdf', compact('tagihan', 'tagihanSiswa'))->render();
        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadHTML($html);
        $pdf->setPaper('A4', 'landscape');

        return $pdf->download("tagihan-{$tagihan->nama}.pdf");
    }
}
