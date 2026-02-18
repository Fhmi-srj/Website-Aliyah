<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\TransaksiKategori;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class TransaksiKategoriController extends Controller
{
    /**
     * Get kategori by tipe (for dropdown).
     */
    public function index(Request $request): JsonResponse
    {
        $tipe = $request->get('tipe');

        $query = TransaksiKategori::where('is_active', true);

        if ($tipe) {
            $query->where('tipe', $tipe);
        }

        $kategori = $query->orderBy('nama')->get();

        return response()->json([
            'success' => true,
            'data' => $kategori,
        ]);
    }

    /**
     * Store a new category (called from inline dropdown "+ Tambah Baru").
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nama' => 'required|string|max:255',
            'tipe' => 'required|in:sumber_pemasukan,sumber_pengeluaran,kategori_pengeluaran',
        ]);

        // Check if already exists
        $existing = TransaksiKategori::where('nama', $validated['nama'])
            ->where('tipe', $validated['tipe'])
            ->first();

        if ($existing) {
            // Reactivate if deactivated
            if (!$existing->is_active) {
                $existing->update(['is_active' => true]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Kategori sudah ada',
                'data' => $existing,
            ]);
        }

        $kategori = TransaksiKategori::create([
            'nama' => $validated['nama'],
            'tipe' => $validated['tipe'],
            'is_active' => true,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Kategori berhasil ditambahkan',
            'data' => $kategori,
        ], 201);
    }

    /**
     * Update an existing category name.
     */
    public function update(Request $request, $id): JsonResponse
    {
        $kategori = TransaksiKategori::findOrFail($id);

        $validated = $request->validate([
            'nama' => 'required|string|max:255',
        ]);

        $kategori->update(['nama' => $validated['nama']]);

        return response()->json([
            'success' => true,
            'message' => 'Kategori berhasil diperbarui',
            'data' => $kategori,
        ]);
    }

    /**
     * Soft-delete a category (deactivate).
     */
    public function destroy($id): JsonResponse
    {
        $kategori = TransaksiKategori::findOrFail($id);
        $kategori->update(['is_active' => false]);

        return response()->json([
            'success' => true,
            'message' => 'Kategori berhasil dihapus',
        ]);
    }
}
