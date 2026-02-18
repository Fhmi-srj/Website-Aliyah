<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Pembayaran;
use App\Models\TagihanSiswa;
use App\Models\Siswa;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class PembayaranController extends Controller
{
    /**
     * Record a payment for a tagihan_siswa.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'tagihan_siswa_id' => 'required|exists:tagihan_siswa,id',
            'nominal' => 'required|numeric|min:1',
            'tanggal_bayar' => 'required|date',
            'catatan' => 'nullable|string|max:500',
        ]);

        $validated['admin_id'] = $request->user()->id;

        $tagihanSiswa = TagihanSiswa::with('siswa:id,nama', 'tagihan:id,nama')->findOrFail($validated['tagihan_siswa_id']);
        $pembayaran = Pembayaran::create($validated);

        ActivityLog::logCreate($pembayaran, "Pembayaran Rp " . number_format($validated['nominal']) . " untuk {$tagihanSiswa->siswa->nama} - {$tagihanSiswa->tagihan->nama}");

        return response()->json([
            'success' => true,
            'message' => 'Pembayaran berhasil dicatat',
            'data' => $pembayaran,
            'tagihan_siswa' => $tagihanSiswa->fresh()->append(['total_dibayar', 'status']),
        ]);
    }

    /**
     * Get payment history for a specific siswa.
     */
    public function historySiswa(Request $request, $siswaId): JsonResponse
    {
        $siswa = Siswa::findOrFail($siswaId);

        $tagihanSiswa = TagihanSiswa::where('siswa_id', $siswaId)
            ->with(['tagihan:id,nama,tanggal_jatuh_tempo', 'kelas:id,nama_kelas', 'pembayaran' => fn($q) => $q->orderBy('tanggal_bayar', 'desc')])
            ->get()
            ->map(function ($ts) {
                return [
                    'id' => $ts->id,
                    'tagihan_id' => $ts->tagihan_id,
                    'tagihan_nama' => $ts->tagihan->nama ?? '-',
                    'tanggal_jatuh_tempo' => $ts->tagihan->tanggal_jatuh_tempo?->format('Y-m-d'),
                    'kelas_nama' => $ts->kelas->nama_kelas ?? '-',
                    'nominal' => $ts->nominal,
                    'total_dibayar' => $ts->total_dibayar,
                    'sisa' => max(0, $ts->nominal - $ts->total_dibayar),
                    'status' => $ts->status,
                    'pembayaran' => $ts->pembayaran,
                ];
            });

        return response()->json([
            'success' => true,
            'data' => [
                'siswa' => $siswa,
                'tagihan' => $tagihanSiswa,
            ],
        ]);
    }

    /**
     * Search siswa with their tagihan summary.
     */
    public function searchSiswa(Request $request): JsonResponse
    {
        $search = $request->query('q', '');
        $tahunAjaranId = $request->user()->tahun_ajaran_id;

        $query = Siswa::query();

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('nama', 'like', "%{$search}%")
                    ->orWhere('nis', 'like', "%{$search}%")
                    ->orWhere('nisn', 'like', "%{$search}%");
            });
        }

        $siswa = $query->whereHas('kelasHistory', fn($q) => $q->where('tahun_ajaran_id', $tahunAjaranId))
            ->with(['kelasHistory' => fn($q) => $q->where('tahun_ajaran_id', $tahunAjaranId)->with('kelas:id,nama_kelas')])
            ->limit(50)
            ->get();

        // For each siswa, get tagihan summary
        $result = $siswa->map(function ($s) {
            $kelas = $s->kelasHistory->first();
            $tagihanSiswa = TagihanSiswa::where('siswa_id', $s->id)
                ->with('tagihan:id,nama,tanggal_jatuh_tempo')
                ->get();

            $today = now()->toDateString();

            $tagihanSummary = $tagihanSiswa->map(fn($ts) => [
                'id' => $ts->id,
                'tagihan_nama' => $ts->tagihan->nama ?? '-',
                'tanggal_jatuh_tempo' => $ts->tagihan->tanggal_jatuh_tempo?->format('Y-m-d'),
                'nominal' => $ts->nominal,
                'total_dibayar' => $ts->total_dibayar,
                'sisa' => max(0, $ts->nominal - $ts->total_dibayar),
                'status' => $ts->status,
            ]);

            // Only count due tagihan in totals
            $dueTagihan = $tagihanSummary->filter(fn($t) => !$t['tanggal_jatuh_tempo'] || $t['tanggal_jatuh_tempo'] <= $today);

            return [
                'id' => $s->id,
                'nama' => $s->nama,
                'nis' => $s->nis,
                'kelas_nama' => $kelas?->kelas?->nama_kelas ?? '-',
                'total_tagihan' => $dueTagihan->sum('nominal'),
                'total_dibayar' => $dueTagihan->sum('total_dibayar'),
                'total_sisa' => $dueTagihan->sum('sisa'),
                'tagihan' => $tagihanSummary,
            ];
        });

        return response()->json(['success' => true, 'data' => $result]);
    }

    /**
     * Update a payment record.
     */
    public function update(Request $request, $id): JsonResponse
    {
        $pembayaran = Pembayaran::findOrFail($id);
        $oldValues = $pembayaran->toArray();

        $validated = $request->validate([
            'nominal' => 'sometimes|numeric|min:1',
            'tanggal_bayar' => 'sometimes|date',
            'catatan' => 'nullable|string|max:500',
        ]);

        $pembayaran->update($validated);
        ActivityLog::logUpdate($pembayaran, $oldValues, "Mengubah pembayaran ID {$id}");

        return response()->json(['success' => true, 'message' => 'Pembayaran berhasil diperbarui', 'data' => $pembayaran->fresh()]);
    }

    /**
     * Delete a payment record.
     */
    public function destroy($id): JsonResponse
    {
        $pembayaran = Pembayaran::findOrFail($id);
        ActivityLog::logDelete($pembayaran, "Menghapus pembayaran ID {$id}");
        $pembayaran->delete();

        return response()->json(['success' => true, 'message' => 'Pembayaran berhasil dihapus']);
    }
}
