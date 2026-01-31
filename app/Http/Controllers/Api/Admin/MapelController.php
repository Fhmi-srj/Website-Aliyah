<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Mapel;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class MapelController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(): JsonResponse
    {
        $mapel = Mapel::orderBy('nama_mapel')->get();
        return response()->json([
            'success' => true,
            'data' => $mapel
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nama_mapel' => 'required|string|max:100',
            'inisial' => 'required|string|max:20',
            'kode_mapel' => 'nullable|string|max:20',
            'kkm' => 'required|integer|min:0|max:100',
            'status' => 'required|in:Aktif,Tidak Aktif',
        ]);

        $mapel = Mapel::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Mata Pelajaran berhasil ditambahkan',
            'data' => $mapel
        ], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Mapel $mapel): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $mapel
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Mapel $mapel): JsonResponse
    {
        $validated = $request->validate([
            'nama_mapel' => 'required|string|max:100',
            'inisial' => 'required|string|max:20',
            'kode_mapel' => 'nullable|string|max:20',
            'kkm' => 'required|integer|min:0|max:100',
            'status' => 'required|in:Aktif,Tidak Aktif',
        ]);

        $mapel->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Mata Pelajaran berhasil diperbarui',
            'data' => $mapel
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Mapel $mapel): JsonResponse
    {
        $mapel->delete();

        return response()->json([
            'success' => true,
            'message' => 'Mata Pelajaran berhasil dihapus'
        ]);
    }
}
