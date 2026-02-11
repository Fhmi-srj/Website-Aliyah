<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\JamPelajaran;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class JamPelajaranController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(): JsonResponse
    {
        $jamPelajaran = JamPelajaran::orderBy('jam_ke')->get();
        return response()->json([
            'success' => true,
            'data' => $jamPelajaran
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'jam_ke' => 'required|string|max:10',
            'jam_mulai' => 'required|date_format:H:i',
            'jam_selesai' => 'required|date_format:H:i',
            'keterangan' => 'nullable|string|max:100',
            'status' => 'nullable|in:Aktif,Tidak Aktif',
        ]);

        $validated['status'] = $validated['status'] ?? 'Aktif';

        $jamPelajaran = JamPelajaran::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Jam Pelajaran berhasil ditambahkan',
            'data' => $jamPelajaran
        ], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(JamPelajaran $jamPelajaran): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $jamPelajaran
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, JamPelajaran $jamPelajaran): JsonResponse
    {
        $validated = $request->validate([
            'jam_ke' => 'required|string|max:10',
            'jam_mulai' => 'required|date_format:H:i',
            'jam_selesai' => 'required|date_format:H:i',
            'keterangan' => 'nullable|string|max:100',
            'status' => 'nullable|in:Aktif,Tidak Aktif',
        ]);

        $validated['status'] = $validated['status'] ?? $jamPelajaran->status;

        $jamPelajaran->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Jam Pelajaran berhasil diperbarui',
            'data' => $jamPelajaran
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(JamPelajaran $jamPelajaran): JsonResponse
    {
        $jamPelajaran->delete();

        return response()->json([
            'success' => true,
            'message' => 'Jam Pelajaran berhasil dihapus'
        ]);
    }
}
