<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Pemasukan;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class PemasukanController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $tahunAjaranId = $request->user()->tahun_ajaran_id;

        $query = Pemasukan::where('tahun_ajaran_id', $tahunAjaranId)
            ->with(['admin:id,name', 'sumber:id,nama']);

        // Filter by month
        if ($request->has('bulan')) {
            $query->whereMonth('tanggal', $request->bulan);
        }

        // Filter by year
        if ($request->has('tahun')) {
            $query->whereYear('tanggal', $request->tahun);
        }

        // Filter by sumber
        if ($request->has('sumber_id')) {
            $query->where('sumber_id', $request->sumber_id);
        }

        $pemasukan = $query->orderBy('tanggal', 'desc')->get();

        $totalNominal = $pemasukan->sum('nominal');

        return response()->json([
            'success' => true,
            'data' => $pemasukan,
            'total' => $totalNominal,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'sumber_id' => 'required|exists:transaksi_kategori,id',
            'nominal' => 'required|numeric|min:0',
            'keterangan' => 'nullable|string',
            'tanggal' => 'required|date',
        ]);

        $validated['admin_id'] = $request->user()->id;
        $validated['tahun_ajaran_id'] = $request->user()->tahun_ajaran_id;

        $pemasukan = Pemasukan::create($validated);

        ActivityLog::logCreate($pemasukan, "Menambahkan pemasukan: Rp " . number_format($pemasukan->nominal, 0, ',', '.'));

        return response()->json([
            'success' => true,
            'message' => 'Pemasukan berhasil ditambahkan',
            'data' => $pemasukan->load(['admin:id,name', 'sumber:id,nama']),
        ], 201);
    }

    public function show($id): JsonResponse
    {
        $pemasukan = Pemasukan::with(['admin:id,name', 'sumber:id,nama'])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $pemasukan,
        ]);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $pemasukan = Pemasukan::findOrFail($id);
        $oldValues = $pemasukan->toArray();

        $validated = $request->validate([
            'sumber_id' => 'sometimes|exists:transaksi_kategori,id',
            'nominal' => 'sometimes|numeric|min:0',
            'keterangan' => 'nullable|string',
            'tanggal' => 'sometimes|date',
        ]);

        $pemasukan->update($validated);

        ActivityLog::logUpdate($pemasukan, $oldValues, "Mengubah pemasukan ID {$pemasukan->id}");

        return response()->json([
            'success' => true,
            'message' => 'Pemasukan berhasil diperbarui',
            'data' => $pemasukan->fresh()->load(['admin:id,name', 'sumber:id,nama']),
        ]);
    }

    public function destroy($id): JsonResponse
    {
        $pemasukan = Pemasukan::findOrFail($id);
        ActivityLog::logDelete($pemasukan, "Menghapus pemasukan: Rp " . number_format($pemasukan->nominal, 0, ',', '.'));
        $pemasukan->delete();

        return response()->json([
            'success' => true,
            'message' => 'Pemasukan berhasil dihapus',
        ]);
    }

    public function exportPdf(Request $request)
    {
        $tahunAjaranId = $request->user()->tahun_ajaran_id;

        $query = Pemasukan::where('tahun_ajaran_id', $tahunAjaranId)
            ->with(['admin:id,name', 'sumber:id,nama']);

        if ($request->has('bulan'))
            $query->whereMonth('tanggal', $request->bulan);
        if ($request->has('tahun'))
            $query->whereYear('tanggal', $request->tahun);

        $pemasukan = $query->orderBy('tanggal', 'desc')->get();

        $html = view('exports.pemasukan-pdf', compact('pemasukan'))->render();
        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadHTML($html);
        $pdf->setPaper('A4', 'portrait');

        return $pdf->download('laporan-pemasukan.pdf');
    }

    public function exportExcel(Request $request)
    {
        $tahunAjaranId = $request->user()->tahun_ajaran_id;

        $query = Pemasukan::where('tahun_ajaran_id', $tahunAjaranId)
            ->with(['admin:id,name', 'sumber:id,nama']);

        if ($request->has('bulan'))
            $query->whereMonth('tanggal', $request->bulan);
        if ($request->has('tahun'))
            $query->whereYear('tanggal', $request->tahun);

        $pemasukan = $query->orderBy('tanggal', 'desc')->get();

        $fileName = 'laporan-pemasukan.csv';
        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"$fileName\"",
        ];

        $callback = function () use ($pemasukan) {
            $file = fopen('php://output', 'w');
            fputcsv($file, ['No', 'Tanggal', 'Sumber', 'Nominal', 'Keterangan', 'Admin']);

            $no = 1;
            foreach ($pemasukan as $p) {
                fputcsv($file, [
                    $no++,
                    $p->tanggal->format('d/m/Y'),
                    $p->sumber->nama ?? '-',
                    $p->nominal,
                    $p->keterangan ?? '-',
                    $p->admin->name ?? '-',
                ]);
            }
            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }
}
