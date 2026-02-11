<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Kelas;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class KelasController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Kelas::with('waliKelas:id,nama')
            ->orderBy('tingkat')
            ->orderBy('nama_kelas');

        // Filter by tahun_ajaran_id if provided
        if ($request->has('tahun_ajaran_id')) {
            $query->where('tahun_ajaran_id', $request->tahun_ajaran_id);
        }

        $kelas = $query->get()->map(function ($item) {
            $item->siswa_count = $item->jumlah_siswa;
            return $item;
        });

        return response()->json([
            'success' => true,
            'data' => $kelas
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        try {
            // Convert empty string to null before validation
            $data = $request->all();
            if (!isset($data['wali_kelas_id']) || $data['wali_kelas_id'] === '' || $data['wali_kelas_id'] === null) {
                $data['wali_kelas_id'] = null;
            } else {
                // Ensure it's an integer
                $data['wali_kelas_id'] = (int) $data['wali_kelas_id'];
            }

            $validated = validator($data, [
                'nama_kelas' => 'required|string|max:100',
                'inisial' => 'required|string|max:20',
                'tingkat' => 'nullable|in:X,XI,XII',
                'wali_kelas_id' => 'nullable|integer|exists:guru,id',
                'kapasitas' => 'nullable|integer|min:1|max:100',
                'status' => 'nullable|in:Aktif,Tidak Ajktif',
            ])->validate();

            // Set defaults
            $validated['tingkat'] = $validated['tingkat'] ?? 'X';
            $validated['kapasitas'] = $validated['kapasitas'] ?? 36;
            $validated['status'] = $validated['status'] ?? 'Aktif';

            $kelas = Kelas::create($validated);

            // Return fresh data with relations
            $kelas = Kelas::with('waliKelas:id,nama')
                ->withCount('siswa')
                ->find($kelas->id);

            return response()->json([
                'success' => true,
                'message' => 'Kelas berhasil ditambahkan',
                'data' => $kelas
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(Kelas $kelas): JsonResponse
    {
        $kelas->load('waliKelas:id,nama');
        $kelas->loadCount('siswa');

        return response()->json([
            'success' => true,
            'data' => $kelas
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Kelas $kelas): JsonResponse
    {
        try {
            // Get the original ID before any operations
            $kelasId = $kelas->id;

            // Convert empty string to null before validation
            $data = $request->all();
            if (!isset($data['wali_kelas_id']) || $data['wali_kelas_id'] === '' || $data['wali_kelas_id'] === null) {
                $data['wali_kelas_id'] = null;
            } else {
                $data['wali_kelas_id'] = (int) $data['wali_kelas_id'];
            }

            $validator = validator($data, [
                'nama_kelas' => 'required|string|max:100',
                'inisial' => 'required|string|max:20',
                'tingkat' => 'nullable|in:X,XI,XII',
                'wali_kelas_id' => 'nullable|integer|exists:guru,id',
                'kapasitas' => 'nullable|integer|min:1|max:100',
                'status' => 'nullable|in:Aktif,Tidak Aktif',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => $validator->errors()->first()
                ], 422);
            }

            $validated = $validator->validated();

            // Use DB query to update directly
            Kelas::where('id', $kelasId)->update($validated);

            // Return fresh data with relations
            $updatedKelas = Kelas::with('waliKelas:id,nama')
                ->withCount('siswa')
                ->find($kelasId);

            return response()->json([
                'success' => true,
                'message' => 'Kelas berhasil diperbarui',
                'data' => $updatedKelas
            ]);
        } catch (\Exception $e) {
            \Log::error('Kelas update error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Kelas $kelas): JsonResponse
    {
        $kelas->delete();

        return response()->json([
            'success' => true,
            'message' => 'Kelas berhasil dihapus'
        ]);
    }
}
