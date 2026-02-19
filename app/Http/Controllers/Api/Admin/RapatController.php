<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Rapat;
use App\Models\AbsensiRapat;
use App\Models\TahunAjaran;
use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class RapatController extends Controller
{
    /**
     * Get the active tahun ajaran ID for the current user.
     */
    private function getActiveTahunAjaranId(Request $request): ?int
    {
        $user = $request->user();
        if ($user && $user->tahun_ajaran_id) {
            return $user->tahun_ajaran_id;
        }
        $current = TahunAjaran::getCurrent();
        return $current ? $current->id : null;
    }

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): JsonResponse
    {
        $tahunAjaranId = $request->query('tahun_ajaran_id') ?? $this->getActiveTahunAjaranId($request);

        $query = Rapat::with(['tahunAjaran:id,nama', 'pimpinanGuru:id,nama', 'sekretarisGuru:id,nama'])
            ->withCount('absensiRapat');

        if ($tahunAjaranId) {
            $query->where('tahun_ajaran_id', $tahunAjaranId);
        }

        $rapat = $query->orderBy('tanggal', 'desc')->get();

        // Auto-update status to 'Selesai' when absensi records exist
        foreach ($rapat as $item) {
            if ($item->absensi_rapat_count > 0 && $item->status === 'Dijadwalkan') {
                $item->update(['status' => 'Selesai']);
                $item->status = 'Selesai';
            }
            // Add absensi_id for print functionality
            $firstAbsensi = $item->absensiRapat()->first();
            $item->absensi_id = $firstAbsensi?->id;
            $item->has_absensi = $firstAbsensi && $firstAbsensi->status === 'submitted';
        }

        return response()->json([
            'success' => true,
            'data' => $rapat
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'agenda_rapat' => 'required|string|max:200',
            'jenis_rapat' => 'required|in:Rutin,Koordinasi,Darurat,Evaluasi',
            'pimpinan' => 'required|string|max:100',
            'sekretaris' => 'nullable|string|max:100',
            'pimpinan_id' => 'nullable|exists:guru,id',
            'sekretaris_id' => 'nullable|exists:guru,id',
            'peserta_rapat' => 'nullable|array',
            'peserta_rapat.*' => 'exists:guru,id',
            'peserta_eksternal' => 'nullable|array',
            'peserta_eksternal.*.nama' => 'required|string|max:100',
            'peserta_eksternal.*.jabatan' => 'nullable|string|max:100',
            'tanggal' => 'required|date',
            'waktu_mulai' => 'required|date_format:H:i',
            'waktu_selesai' => 'required|date_format:H:i',
            'tempat' => 'required|string|max:100',
            'status' => 'required|in:Dijadwalkan,Berlangsung,Selesai,Dibatalkan',
            'tahun_ajaran_id' => 'nullable|exists:tahun_ajaran,id',
        ]);

        // Auto-assign tahun_ajaran_id if not provided
        if (empty($validated['tahun_ajaran_id'])) {
            $validated['tahun_ajaran_id'] = $this->getActiveTahunAjaranId($request);
        }

        $rapat = Rapat::create($validated);

        // Log activity
        ActivityLog::logCreate($rapat, "Menambahkan rapat: {$rapat->agenda_rapat}");

        return response()->json([
            'success' => true,
            'message' => 'Rapat berhasil ditambahkan',
            'data' => $rapat
        ], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Rapat $rapat): JsonResponse
    {
        $rapat->load(['tahunAjaran:id,nama', 'pimpinanGuru:id,nama', 'sekretarisGuru:id,nama']);
        return response()->json([
            'success' => true,
            'data' => $rapat
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Rapat $rapat): JsonResponse
    {
        $validated = $request->validate([
            'agenda_rapat' => 'required|string|max:200',
            'jenis_rapat' => 'required|in:Rutin,Koordinasi,Darurat,Evaluasi',
            'pimpinan' => 'required|string|max:100',
            'sekretaris' => 'nullable|string|max:100',
            'pimpinan_id' => 'nullable|exists:guru,id',
            'sekretaris_id' => 'nullable|exists:guru,id',
            'peserta_rapat' => 'nullable|array',
            'peserta_rapat.*' => 'exists:guru,id',
            'peserta_eksternal' => 'nullable|array',
            'peserta_eksternal.*.nama' => 'required|string|max:100',
            'peserta_eksternal.*.jabatan' => 'nullable|string|max:100',
            'tanggal' => 'required|date',
            'waktu_mulai' => 'required|date_format:H:i',
            'waktu_selesai' => 'required|date_format:H:i',
            'tempat' => 'required|string|max:100',
            'status' => 'required|in:Dijadwalkan,Berlangsung,Selesai,Dibatalkan',
            'tahun_ajaran_id' => 'nullable|exists:tahun_ajaran,id',
        ]);

        // Capture old values for logging
        $oldValues = $rapat->getOriginal();

        $rapat->update($validated);

        // Log activity
        ActivityLog::logUpdate($rapat, $oldValues, "Mengubah rapat: {$rapat->agenda_rapat}");

        return response()->json([
            'success' => true,
            'message' => 'Rapat berhasil diperbarui',
            'data' => $rapat
        ]);
    }

    /**
     * Remove the specified resource from storage.
     * Checks for related absensi records before deleting.
     */
    public function destroy(Request $request, Rapat $rapat): JsonResponse
    {
        $absensiCount = AbsensiRapat::where('rapat_id', $rapat->id)->count();

        if ($absensiCount > 0 && !$request->boolean('force')) {
            return response()->json([
                'success' => false,
                'message' => "Rapat ini memiliki {$absensiCount} data absensi yang akan ikut terhapus. Gunakan opsi \"Hapus Paksa\" untuk melanjutkan.",
                'requires_force' => true,
                'related_counts' => ['absensi_rapat' => $absensiCount],
            ], 409);
        }

        // Log activity before delete
        ActivityLog::logDelete($rapat, "Menghapus rapat: {$rapat->agenda_rapat}");

        $rapat->delete();

        return response()->json([
            'success' => true,
            'message' => 'Rapat berhasil dihapus'
        ]);
    }

    /**
     * Bulk delete rapat entries.
     * Checks for related absensi records before deleting.
     */
    public function bulkDelete(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'exists:rapat,id',
            'force' => 'sometimes|boolean',
        ]);

        $absensiCount = AbsensiRapat::whereIn('rapat_id', $validated['ids'])->count();

        if ($absensiCount > 0 && !$request->boolean('force')) {
            return response()->json([
                'success' => false,
                'message' => "Beberapa rapat memiliki {$absensiCount} data absensi yang akan ikut terhapus. Gunakan opsi \"Hapus Paksa\" untuk melanjutkan.",
                'requires_force' => true,
                'related_counts' => ['absensi_rapat' => $absensiCount],
            ], 409);
        }

        $rapats = Rapat::whereIn('id', $validated['ids'])->get();

        foreach ($rapats as $rapat) {
            ActivityLog::logDelete($rapat, "Menghapus rapat (bulk): {$rapat->agenda_rapat}");
        }

        Rapat::whereIn('id', $validated['ids'])->delete();

        return response()->json([
            'success' => true,
            'message' => count($validated['ids']) . ' agenda rapat berhasil dihapus'
        ]);
    }
}
