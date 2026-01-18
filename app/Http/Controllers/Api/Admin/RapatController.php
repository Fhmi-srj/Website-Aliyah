<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Rapat;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class RapatController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(): JsonResponse
    {
        $rapat = Rapat::orderBy('tanggal', 'desc')->get();

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
            'tanggal' => 'required|date',
            'waktu_mulai' => 'required|date_format:H:i',
            'waktu_selesai' => 'required|date_format:H:i',
            'tempat' => 'required|string|max:100',
            'status' => 'required|in:Dijadwalkan,Berlangsung,Selesai,Dibatalkan',
        ]);

        $rapat = Rapat::create($validated);

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
            'tanggal' => 'required|date',
            'waktu_mulai' => 'required|date_format:H:i',
            'waktu_selesai' => 'required|date_format:H:i',
            'tempat' => 'required|string|max:100',
            'status' => 'required|in:Dijadwalkan,Berlangsung,Selesai,Dibatalkan',
        ]);

        $rapat->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Rapat berhasil diperbarui',
            'data' => $rapat
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Rapat $rapat): JsonResponse
    {
        $rapat->delete();

        return response()->json([
            'success' => true,
            'message' => 'Rapat berhasil dihapus'
        ]);
    }
}

