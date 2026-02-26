<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Ekskul;
use App\Models\TahunAjaran;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class EkskulController extends Controller
{
    private function getActiveTahunAjaranId(Request $request)
    {
        $user = $request->user();
        if ($user && $user->tahun_ajaran_id) {
            return $user->tahun_ajaran_id;
        }
        $active = TahunAjaran::where('is_active', true)->first();
        return $active ? $active->id : null;
    }

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $tahunAjaranId = $request->query('tahun_ajaran_id') ?? $this->getActiveTahunAjaranId($request);

            $query = Ekskul::with('pembina:id,nama')
                ->withCount('anggota');

            if ($tahunAjaranId) {
                $query->where('tahun_ajaran_id', $tahunAjaranId);
            }

            $ekskul = $query->orderBy('nama_ekskul')->get();

            return response()->json([
                'success' => true,
                'data' => $ekskul
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'nama_ekskul' => 'required|string|max:100',
                'kategori' => 'required|in:Olahraga,Seni,Akademik,Keagamaan',
                'pembina_id' => 'nullable|exists:guru,id',
                'hari' => 'required|in:Senin,Selasa,Rabu,Kamis,Jumat,Sabtu',
                'jam_mulai' => 'nullable|date_format:H:i',
                'jam_selesai' => 'nullable|date_format:H:i',
                'tempat' => 'nullable|string|max:100',
                'deskripsi' => 'nullable|string|max:500',
                'status' => 'required|in:Aktif,Tidak Aktif',
                'tahun_ajaran_id' => 'nullable|exists:tahun_ajaran,id',
            ]);

            if (empty($validated['tahun_ajaran_id'])) {
                $validated['tahun_ajaran_id'] = $this->getActiveTahunAjaranId($request);
            }

            $ekskul = Ekskul::create($validated);
            $ekskul->load('pembina:id,nama');
            $ekskul->loadCount('anggota');

            return response()->json([
                'success' => true,
                'message' => 'Ekstrakurikuler berhasil ditambahkan',
                'data' => $ekskul
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
    public function show(Ekskul $ekskul): JsonResponse
    {
        $ekskul->load('pembina:id,nama');
        $ekskul->loadCount('anggota');

        return response()->json([
            'success' => true,
            'data' => $ekskul
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Ekskul $ekskul): JsonResponse
    {
        try {
            $validated = $request->validate([
                'nama_ekskul' => 'required|string|max:100',
                'kategori' => 'required|in:Olahraga,Seni,Akademik,Keagamaan',
                'pembina_id' => 'nullable|exists:guru,id',
                'hari' => 'required|in:Senin,Selasa,Rabu,Kamis,Jumat,Sabtu',
                'jam_mulai' => 'nullable|date_format:H:i',
                'jam_selesai' => 'nullable|date_format:H:i',
                'tempat' => 'nullable|string|max:100',
                'deskripsi' => 'nullable|string|max:500',
                'status' => 'required|in:Aktif,Tidak Aktif',
                'tahun_ajaran_id' => 'nullable|exists:tahun_ajaran,id',
            ]);

            // Preserve existing tahun_ajaran_id if not provided
            if (empty($validated['tahun_ajaran_id'])) {
                $validated['tahun_ajaran_id'] = $ekskul->tahun_ajaran_id ?? $this->getActiveTahunAjaranId($request);
            }

            $ekskul->update($validated);
            $ekskul->load('pembina:id,nama');
            $ekskul->loadCount('anggota');

            return response()->json([
                'success' => true,
                'message' => 'Ekstrakurikuler berhasil diperbarui',
                'data' => $ekskul
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Ekskul $ekskul): JsonResponse
    {
        $ekskul->delete();

        return response()->json([
            'success' => true,
            'message' => 'Ekstrakurikuler berhasil dihapus'
        ]);
    }

    /**
     * Get members of an ekskul.
     */
    public function getAnggota(Ekskul $ekskul): JsonResponse
    {
        $anggota = $ekskul->anggota()
            ->select('siswa.id', 'siswa.nama', 'siswa.nis')
            ->withPivot('tanggal_daftar', 'status')
            ->orderBy('siswa.nama')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $anggota
        ]);
    }

    /**
     * Add a member to an ekskul.
     */
    public function addAnggota(Request $request, Ekskul $ekskul): JsonResponse
    {
        $validated = $request->validate([
            'siswa_id' => 'required|exists:siswa,id',
        ]);

        // Check if already a member
        $exists = $ekskul->anggota()->where('siswa_id', $validated['siswa_id'])->exists();
        if ($exists) {
            // Update status if existed
            $ekskul->anggota()->updateExistingPivot($validated['siswa_id'], [
                'status' => 'Aktif',
                'tanggal_daftar' => now()->toDateString(),
            ]);
        } else {
            $ekskul->anggota()->attach($validated['siswa_id'], [
                'tanggal_daftar' => now()->toDateString(),
                'status' => 'Aktif',
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Anggota berhasil ditambahkan'
        ]);
    }

    /**
     * Remove a member from an ekskul.
     */
    public function removeAnggota(Ekskul $ekskul, $siswaId): JsonResponse
    {
        $ekskul->anggota()->detach($siswaId);

        return response()->json([
            'success' => true,
            'message' => 'Anggota berhasil dihapus'
        ]);
    }
}
