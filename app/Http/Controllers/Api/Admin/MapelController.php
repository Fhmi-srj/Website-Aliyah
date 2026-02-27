<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Mapel;
use App\Models\Jadwal;
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
            'inisial' => 'nullable|string|max:20',
            'kode_mapel' => 'nullable|string|max:20',
            'kkm' => 'nullable|integer|min:0|max:100',
            'status' => 'nullable|in:Aktif,Tidak Aktif',
            'is_non_akademik' => 'nullable|boolean',
        ]);

        // Set defaults
        if (empty($validated['inisial'])) {
            $validated['inisial'] = strtoupper(substr($validated['nama_mapel'], 0, 5));
        }
        $validated['kkm'] = $validated['kkm'] ?? 75;
        $validated['status'] = $validated['status'] ?? 'Aktif';
        $validated['is_non_akademik'] = $validated['is_non_akademik'] ?? false;

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
            'inisial' => 'nullable|string|max:20',
            'kode_mapel' => 'nullable|string|max:20',
            'kkm' => 'nullable|integer|min:0|max:100',
            'status' => 'nullable|in:Aktif,Tidak Aktif',
            'is_non_akademik' => 'nullable|boolean',
        ]);

        // Set defaults for optional fields if null but not sent (usually they are sent from front-end)
        // But for update we just merge with defaults if they were missing in the request but required in Model
        if (empty($validated['inisial']) && isset($validated['nama_mapel'])) {
            // If name is being updated but initial is missing, we could auto-generate or just let it be.
            // The Model probably has these as non-nullable so we need values.
        }
        $validated['kkm'] = $validated['kkm'] ?? ($mapel->kkm ?? 75);
        $validated['status'] = $validated['status'] ?? ($mapel->status ?? 'Aktif');

        $mapel->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Mata Pelajaran berhasil diperbarui',
            'data' => $mapel
        ]);
    }

    /**
     * Remove the specified resource from storage.
     * Checks for related jadwal records before deleting.
     */
    public function destroy(Request $request, Mapel $mapel): JsonResponse
    {
        $jadwalCount = Jadwal::where('mapel_id', $mapel->id)->count();

        if ($jadwalCount > 0 && !$request->boolean('force')) {
            return response()->json([
                'success' => false,
                'message' => "Mata Pelajaran ini memiliki {$jadwalCount} data jadwal yang akan ikut terhapus. Gunakan opsi \"Hapus Paksa\" untuk melanjutkan.",
                'requires_force' => true,
                'related_counts' => ['jadwal' => $jadwalCount],
            ], 409);
        }

        $mapel->delete();

        return response()->json([
            'success' => true,
            'message' => 'Mata Pelajaran berhasil dihapus'
        ]);
    }
}
