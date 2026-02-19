<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Jadwal;
use App\Models\AbsensiMengajar;
use App\Models\TahunAjaran;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class JadwalController extends Controller
{
    /**
     * Get the active tahun ajaran ID for the current user.
     */
    private function getActiveTahunAjaranId(Request $request): ?int
    {
        // First check user preference
        $user = $request->user();
        if ($user && $user->tahun_ajaran_id) {
            return $user->tahun_ajaran_id;
        }

        // Fallback to current period
        $current = TahunAjaran::getCurrent();
        return $current ? $current->id : null;
    }

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): JsonResponse
    {
        $tahunAjaranId = $request->query('tahun_ajaran_id') ?? $this->getActiveTahunAjaranId($request);

        $query = Jadwal::with(['guru:id,nama', 'mapel:id,nama_mapel', 'kelas:id,nama_kelas', 'tahunAjaran:id,nama', 'jamPelajaran:id,jam_ke,jam_mulai,jam_selesai', 'jamPelajaranSampai:id,jam_ke,jam_mulai,jam_selesai']);

        // Filter by tahun ajaran if provided
        if ($tahunAjaranId) {
            $query->where('tahun_ajaran_id', $tahunAjaranId);
        }

        $jadwal = $query->orderBy('hari')
            ->orderBy('jam_ke')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $jadwal
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'jam_ke' => 'nullable|string|max:10',
            'jam_mulai' => 'nullable|date_format:H:i',
            'jam_selesai' => 'nullable|date_format:H:i',
            'jam_pelajaran_id' => 'nullable|exists:jam_pelajaran,id',
            'jam_pelajaran_sampai_id' => 'nullable|exists:jam_pelajaran,id',
            'guru_id' => 'nullable|exists:guru,id',
            'mapel_id' => 'required|exists:mapel,id',
            'kelas_id' => 'required|exists:kelas,id',
            'hari' => 'required|in:Senin,Selasa,Rabu,Kamis,Jumat,Sabtu',
            'semester' => 'nullable|in:Ganjil,Genap',
            'tahun_ajaran' => 'nullable|string|max:20', // Keep for backward compatibility
            'tahun_ajaran_id' => 'nullable|exists:tahun_ajaran,id',
            'status' => 'nullable|in:Aktif,Tidak Aktif',
        ]);

        // Set defaults
        $validated['jam_ke'] = $validated['jam_ke'] ?? '1';
        $validated['semester'] = $validated['semester'] ?? 'Ganjil';
        $validated['status'] = $validated['status'] ?? 'Aktif';

        // If tahun_ajaran_id not provided, use active one
        if (empty($validated['tahun_ajaran_id'])) {
            $validated['tahun_ajaran_id'] = $this->getActiveTahunAjaranId($request);

            // Also set tahun_ajaran text for backward compatibility
            if ($validated['tahun_ajaran_id']) {
                $ta = TahunAjaran::find($validated['tahun_ajaran_id']);
                if ($ta) {
                    $validated['tahun_ajaran'] = $ta->nama;
                }
            }
        }

        $jadwal = Jadwal::create($validated);
        $jadwal->load(['guru:id,nama', 'mapel:id,nama_mapel', 'kelas:id,nama_kelas', 'tahunAjaran:id,nama', 'jamPelajaran:id,jam_ke,jam_mulai,jam_selesai', 'jamPelajaranSampai:id,jam_ke,jam_mulai,jam_selesai']);

        return response()->json([
            'success' => true,
            'message' => 'Jadwal berhasil ditambahkan',
            'data' => $jadwal
        ], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Jadwal $jadwal): JsonResponse
    {
        $jadwal->load(['guru:id,nama', 'mapel:id,nama_mapel', 'kelas:id,nama_kelas', 'tahunAjaran:id,nama', 'jamPelajaran:id,jam_ke,jam_mulai,jam_selesai', 'jamPelajaranSampai:id,jam_ke,jam_mulai,jam_selesai']);
        return response()->json([
            'success' => true,
            'data' => $jadwal
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Jadwal $jadwal): JsonResponse
    {
        $validated = $request->validate([
            'jam_ke' => 'nullable|string|max:10',
            'jam_mulai' => 'nullable|date_format:H:i',
            'jam_selesai' => 'nullable|date_format:H:i',
            'jam_pelajaran_id' => 'nullable|exists:jam_pelajaran,id',
            'jam_pelajaran_sampai_id' => 'nullable|exists:jam_pelajaran,id',
            'guru_id' => 'nullable|exists:guru,id',
            'mapel_id' => 'required|exists:mapel,id',
            'kelas_id' => 'required|exists:kelas,id',
            'hari' => 'required|in:Senin,Selasa,Rabu,Kamis,Jumat,Sabtu',
            'semester' => 'nullable|in:Ganjil,Genap',
            'tahun_ajaran' => 'nullable|string|max:20',
            'tahun_ajaran_id' => 'nullable|exists:tahun_ajaran,id',
            'status' => 'nullable|in:Aktif,Tidak Aktif',
        ]);

        // Sync tahun_ajaran text if tahun_ajaran_id is provided
        if (!empty($validated['tahun_ajaran_id'])) {
            $ta = TahunAjaran::find($validated['tahun_ajaran_id']);
            if ($ta) {
                $validated['tahun_ajaran'] = $ta->nama;
            }
        }

        $jadwal->update($validated);
        $jadwal->load(['guru:id,nama', 'mapel:id,nama_mapel', 'kelas:id,nama_kelas', 'tahunAjaran:id,nama', 'jamPelajaran:id,jam_ke,jam_mulai,jam_selesai', 'jamPelajaranSampai:id,jam_ke,jam_mulai,jam_selesai']);

        return response()->json([
            'success' => true,
            'message' => 'Jadwal berhasil diperbarui',
            'data' => $jadwal
        ]);
    }

    /**
     * Remove the specified resource from storage.
     * Checks for related absensi records before deleting.
     */
    public function destroy(Request $request, Jadwal $jadwal): JsonResponse
    {
        $absensiCount = AbsensiMengajar::where('jadwal_id', $jadwal->id)->count();

        if ($absensiCount > 0 && !$request->boolean('force')) {
            return response()->json([
                'success' => false,
                'message' => "Jadwal ini memiliki {$absensiCount} data absensi mengajar yang akan ikut terhapus. Gunakan opsi \"Hapus Paksa\" untuk melanjutkan.",
                'requires_force' => true,
                'related_counts' => ['absensi_mengajar' => $absensiCount],
            ], 409);
        }

        $jadwal->delete();

        return response()->json([
            'success' => true,
            'message' => 'Jadwal berhasil dihapus'
        ]);
    }
}
