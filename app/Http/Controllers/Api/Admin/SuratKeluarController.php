<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\SuratKeluar;
use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;

class SuratKeluarController extends Controller
{
    /**
     * Display a listing of surat keluar.
     */
    public function index(Request $request): JsonResponse
    {
        $query = SuratKeluar::with(['user:id,name', 'tahunAjaran:id,nama']);

        // Filter by tahun_ajaran_id
        if ($request->filled('tahun_ajaran_id')) {
            $query->where('tahun_ajaran_id', $request->tahun_ajaran_id);
        }

        // Filter by kode_surat
        if ($request->filled('kode_surat')) {
            $query->where('kode_surat', $request->kode_surat);
        }

        // Filter by jenis_surat
        if ($request->filled('jenis_surat')) {
            $query->where('jenis_surat', $request->jenis_surat);
        }

        $data = $query->orderBy('tanggal', 'desc')->orderBy('nomor_urut', 'desc')->get();

        // Append computed attributes
        $data->each(function ($item) {
            $item->append(['kode_surat_label', 'jenis_surat_label']);
            $item->admin_name = $item->user->name ?? '-';
            $item->file_url = $item->file_surat ? asset('storage/' . $item->file_surat) : null;
        });

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    /**
     * Store a newly created surat keluar.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'kode_surat' => 'required|string|in:001,002,003,004,005',
            'jenis_surat' => 'required|string|in:001,002,003,004,005,006,007,008,009',
            'tanggal' => 'required|date',
            'keterangan' => 'nullable|string|max:500',
            'tahun_ajaran_id' => 'nullable|exists:tahun_ajaran,id',
            'template_data' => 'nullable|array',
        ]);

        // Generate nomor surat
        $nomorData = SuratKeluar::generateNomorSurat(
            $validated['kode_surat'],
            $validated['jenis_surat'],
            $validated['tanggal']
        );

        $createData = [
            'user_id' => $request->user()->id,
            'kode_surat' => $validated['kode_surat'],
            'jenis_surat' => $validated['jenis_surat'],
            'nomor_urut' => $nomorData['nomor_urut'],
            'nomor_surat' => $nomorData['nomor_surat'],
            'tanggal' => $validated['tanggal'],
            'keterangan' => $validated['keterangan'] ?? null,
            'tahun_ajaran_id' => $validated['tahun_ajaran_id'] ?? $request->user()->tahun_ajaran_id,
        ];

        // Auto-generate .docx for template jenis (007, 008, 009)
        $isTemplate = in_array($validated['jenis_surat'], ['007', '008', '009']);
        if ($isTemplate && !empty($validated['template_data'])) {
            try {
                $templateController = new TemplateSuratController();
                $templateData = $validated['template_data'];
                $templateData['tanggal'] = $validated['tanggal']; // Pass surat date to template
                $filePath = $templateController->generateAndSave(
                    $validated['jenis_surat'],
                    $templateData,
                    $nomorData['nomor_surat']
                );
                $createData['file_surat'] = $filePath;
            } catch (\Exception $e) {
                \Log::error('Template generation failed: ' . $e->getMessage());
            }
            $createData['template_data'] = $validated['template_data'];
        }

        $surat = SuratKeluar::create($createData);

        // Log activity
        ActivityLog::logCreate($surat, "Menambahkan surat keluar: {$surat->nomor_surat}");

        return response()->json([
            'success' => true,
            'message' => 'Surat keluar berhasil ditambahkan',
            'data' => $surat->load('user:id,name'),
        ], 201);
    }

    /**
     * Display the specified surat keluar.
     */
    public function show(SuratKeluar $suratKeluar): JsonResponse
    {
        $suratKeluar->load('user:id,name');
        $suratKeluar->append(['kode_surat_label', 'jenis_surat_label']);
        $suratKeluar->file_url = $suratKeluar->file_surat ? asset('storage/' . $suratKeluar->file_surat) : null;

        return response()->json([
            'success' => true,
            'data' => $suratKeluar,
        ]);
    }

    /**
     * Update the specified surat keluar.
     */
    public function update(Request $request, SuratKeluar $suratKeluar): JsonResponse
    {
        $validated = $request->validate([
            'kode_surat' => 'required|string|in:001,002,003,004,005',
            'jenis_surat' => 'required|string|in:001,002,003,004,005,006,007,008,009',
            'tanggal' => 'required|date',
            'keterangan' => 'nullable|string|max:500',
            'tahun_ajaran_id' => 'nullable|exists:tahun_ajaran,id',
            'template_data' => 'nullable|array',
        ]);

        // Regenerate nomor_surat if kode/jenis/tanggal changed
        $needsRegenerate = (
            $suratKeluar->kode_surat !== $validated['kode_surat'] ||
            $suratKeluar->jenis_surat !== $validated['jenis_surat'] ||
            $suratKeluar->tanggal->format('Y-m') !== \Carbon\Carbon::parse($validated['tanggal'])->format('Y-m')
        );

        if ($needsRegenerate) {
            $nomorData = SuratKeluar::generateNomorSurat(
                $validated['kode_surat'],
                $validated['jenis_surat'],
                $validated['tanggal']
            );
            $validated['nomor_urut'] = $nomorData['nomor_urut'];
            $validated['nomor_surat'] = $nomorData['nomor_surat'];
        }

        // Re-generate .docx for template jenis (007, 008, 009)
        $isTemplate = in_array($validated['jenis_surat'], ['007', '008', '009']);
        if ($isTemplate && !empty($validated['template_data'])) {
            try {
                // Delete old file if exists
                if ($suratKeluar->file_surat) {
                    $oldPath = storage_path('app/public/' . $suratKeluar->file_surat);
                    if (file_exists($oldPath)) {
                        unlink($oldPath);
                    }
                }
                $templateController = new TemplateSuratController();
                $templateData = $validated['template_data'];
                $templateData['tanggal'] = $validated['tanggal'];
                $nomorForFile = $validated['nomor_surat'] ?? $suratKeluar->nomor_surat;
                $filePath = $templateController->generateAndSave(
                    $validated['jenis_surat'],
                    $templateData,
                    $nomorForFile
                );
                $validated['file_surat'] = $filePath;
            } catch (\Exception $e) {
                \Log::error('Template regeneration failed: ' . $e->getMessage());
            }
        }

        $oldValues = $suratKeluar->getOriginal();
        $suratKeluar->update($validated);

        ActivityLog::logUpdate($suratKeluar, $oldValues, "Mengubah surat keluar: {$suratKeluar->nomor_surat}");

        return response()->json([
            'success' => true,
            'message' => 'Surat keluar berhasil diperbarui',
            'data' => $suratKeluar->load('user:id,name'),
        ]);
    }

    /**
     * Remove the specified surat keluar.
     */
    public function destroy(SuratKeluar $suratKeluar): JsonResponse
    {
        // Delete file if exists
        if ($suratKeluar->file_surat && Storage::disk('public')->exists($suratKeluar->file_surat)) {
            Storage::disk('public')->delete($suratKeluar->file_surat);
        }

        ActivityLog::logDelete($suratKeluar, "Menghapus surat keluar: {$suratKeluar->nomor_surat}");

        $suratKeluar->delete();

        return response()->json([
            'success' => true,
            'message' => 'Surat keluar berhasil dihapus',
        ]);
    }

    /**
     * Upload file for a surat keluar.
     */
    public function upload(Request $request, $id): JsonResponse
    {
        $request->validate([
            'file' => 'required|file|mimes:pdf,doc,docx,jpg,jpeg,png|max:10240',
        ]);

        $surat = SuratKeluar::findOrFail($id);

        // Delete old file
        if ($surat->file_surat && Storage::disk('public')->exists($surat->file_surat)) {
            Storage::disk('public')->delete($surat->file_surat);
        }

        $path = $request->file('file')->store('surat-keluar', 'public');
        $surat->update(['file_surat' => $path]);

        return response()->json([
            'success' => true,
            'message' => 'File berhasil diupload',
            'data' => [
                'path' => $path,
                'url' => asset('storage/' . $path),
            ],
        ]);
    }

    /**
     * Bulk delete surat keluar.
     */
    public function bulkDelete(Request $request): JsonResponse
    {
        $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'exists:surat_keluar,id',
        ]);

        $suratList = SuratKeluar::whereIn('id', $request->ids)->get();

        foreach ($suratList as $surat) {
            if ($surat->file_surat && Storage::disk('public')->exists($surat->file_surat)) {
                Storage::disk('public')->delete($surat->file_surat);
            }
            $surat->delete();
        }

        return response()->json([
            'success' => true,
            'message' => count($request->ids) . ' surat keluar berhasil dihapus',
        ]);
    }

    /**
     * Get mappings for dropdowns.
     */
    public function getMappings(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => [
                'kode_surat' => SuratKeluar::KODE_SURAT,
                'jenis_surat' => SuratKeluar::JENIS_SURAT,
            ],
        ]);
    }
}
