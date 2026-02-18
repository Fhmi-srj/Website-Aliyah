<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Pengeluaran;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class PengeluaranController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $tahunAjaranId = $request->user()->tahun_ajaran_id;

        $query = Pengeluaran::where('tahun_ajaran_id', $tahunAjaranId)
            ->with(['admin:id,name', 'sumber:id,nama', 'kategori:id,nama']);

        if ($request->has('bulan')) {
            $query->whereMonth('tanggal', $request->bulan);
        }
        if ($request->has('tahun')) {
            $query->whereYear('tanggal', $request->tahun);
        }
        if ($request->has('sumber_id')) {
            $query->where('sumber_id', $request->sumber_id);
        }
        if ($request->has('kategori_id')) {
            $query->where('kategori_id', $request->kategori_id);
        }

        $pengeluaran = $query->orderBy('tanggal', 'desc')->get();

        $totalNominal = $pengeluaran->sum('nominal');

        return response()->json([
            'success' => true,
            'data' => $pengeluaran,
            'total' => $totalNominal,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'sumber_id' => 'required|exists:transaksi_kategori,id',
            'nominal' => 'required|numeric|min:0',
            'kategori_id' => 'required|exists:transaksi_kategori,id',
            'keterangan' => 'nullable|string',
            'tanggal' => 'required|date',
        ]);

        $validated['admin_id'] = $request->user()->id;
        $validated['tahun_ajaran_id'] = $request->user()->tahun_ajaran_id;

        $pengeluaran = Pengeluaran::create($validated);

        ActivityLog::logCreate($pengeluaran, "Menambahkan pengeluaran: Rp " . number_format($pengeluaran->nominal, 0, ',', '.'));

        return response()->json([
            'success' => true,
            'message' => 'Pengeluaran berhasil ditambahkan',
            'data' => $pengeluaran->load(['admin:id,name', 'sumber:id,nama', 'kategori:id,nama']),
        ], 201);
    }

    public function show($id): JsonResponse
    {
        $pengeluaran = Pengeluaran::with(['admin:id,name', 'sumber:id,nama', 'kategori:id,nama'])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $pengeluaran,
        ]);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $pengeluaran = Pengeluaran::findOrFail($id);
        $oldValues = $pengeluaran->toArray();

        $validated = $request->validate([
            'sumber_id' => 'sometimes|exists:transaksi_kategori,id',
            'nominal' => 'sometimes|numeric|min:0',
            'kategori_id' => 'sometimes|exists:transaksi_kategori,id',
            'keterangan' => 'nullable|string',
            'tanggal' => 'sometimes|date',
        ]);

        $pengeluaran->update($validated);

        ActivityLog::logUpdate($pengeluaran, $oldValues, "Mengubah pengeluaran ID {$pengeluaran->id}");

        return response()->json([
            'success' => true,
            'message' => 'Pengeluaran berhasil diperbarui',
            'data' => $pengeluaran->fresh()->load(['admin:id,name', 'sumber:id,nama', 'kategori:id,nama']),
        ]);
    }

    public function destroy($id): JsonResponse
    {
        $pengeluaran = Pengeluaran::findOrFail($id);
        ActivityLog::logDelete($pengeluaran, "Menghapus pengeluaran: Rp " . number_format($pengeluaran->nominal, 0, ',', '.'));
        $pengeluaran->delete();

        return response()->json([
            'success' => true,
            'message' => 'Pengeluaran berhasil dihapus',
        ]);
    }

    public function exportPdf(Request $request)
    {
        $tahunAjaranId = $request->user()->tahun_ajaran_id;

        $query = Pengeluaran::where('tahun_ajaran_id', $tahunAjaranId)
            ->with(['admin:id,name', 'sumber:id,nama', 'kategori:id,nama']);

        if ($request->has('bulan'))
            $query->whereMonth('tanggal', $request->bulan);
        if ($request->has('tahun'))
            $query->whereYear('tanggal', $request->tahun);

        $pengeluaran = $query->orderBy('tanggal', 'desc')->get();

        $html = view('exports.pengeluaran-pdf', compact('pengeluaran'))->render();
        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadHTML($html);
        $pdf->setPaper('A4', 'portrait');

        return $pdf->download('laporan-pengeluaran.pdf');
    }

    public function exportExcel(Request $request)
    {
        $tahunAjaranId = $request->user()->tahun_ajaran_id;

        $query = Pengeluaran::where('tahun_ajaran_id', $tahunAjaranId)
            ->with(['admin:id,name', 'sumber:id,nama', 'kategori:id,nama']);

        if ($request->has('bulan'))
            $query->whereMonth('tanggal', $request->bulan);
        if ($request->has('tahun'))
            $query->whereYear('tanggal', $request->tahun);

        $pengeluaran = $query->orderBy('tanggal', 'desc')->get();

        $fileName = 'laporan-pengeluaran.csv';
        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"$fileName\"",
        ];

        $callback = function () use ($pengeluaran) {
            $file = fopen('php://output', 'w');
            fputcsv($file, ['No', 'Tanggal', 'Sumber', 'Nominal', 'Kategori', 'Keterangan', 'Admin']);

            $no = 1;
            foreach ($pengeluaran as $p) {
                fputcsv($file, [
                    $no++,
                    $p->tanggal->format('d/m/Y'),
                    $p->sumber->nama ?? '-',
                    $p->nominal,
                    $p->kategori->nama ?? '-',
                    $p->keterangan ?? '-',
                    $p->admin->name ?? '-',
                ]);
            }
            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }
}
