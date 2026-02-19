<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Siswa;
use App\Models\SiswaKelas;
use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class SiswaController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): JsonResponse
    {
        $tahunAjaranId = $request->query('tahun_ajaran_id');

        // Filter by status if provided (for Alumni page)
        if ($request->has('status')) {
            $status = $request->status;

            // If filtering Alumni with tahun_ajaran_id, get alumni who graduated from PREVIOUS year
            // Example: When viewing 2026/2027, show students who graduated at end of 2025/2026
            if ($status === 'Alumni' && $tahunAjaranId) {
                // Get the selected tahun_ajaran
                $selectedTahun = \App\Models\TahunAjaran::find($tahunAjaranId);

                // Find the previous tahun_ajaran (by order or by comparing nama)
                $previousTahun = \App\Models\TahunAjaran::where('id', '<', $tahunAjaranId)
                    ->orderBy('id', 'desc')
                    ->first();

                // If no previous tahun_ajaran, return empty
                if (!$previousTahun) {
                    return response()->json([
                        'success' => true,
                        'data' => []
                    ]);
                }

                // Get students who graduated (Lulus) in the previous tahun_ajaran
                $siswaKelas = SiswaKelas::where('tahun_ajaran_id', $previousTahun->id)
                    ->where('status', 'Lulus')
                    ->with(['siswa', 'kelas', 'tahunAjaran'])
                    ->get();

                $data = $siswaKelas->map(function ($sk) {
                    $siswa = $sk->siswa->toArray();
                    $siswa['kelas'] = $sk->kelas;
                    $siswa['kelas_id'] = $sk->kelas_id;
                    $siswa['tahun_lulus'] = $sk->tahunAjaran;
                    $siswa['kelas_history'] = [
                        [
                            'kelas' => $sk->kelas,
                            'tahun_ajaran' => $sk->tahunAjaran,
                            'status' => 'Lulus'
                        ]
                    ];
                    return $siswa;
                })->values();

                return response()->json([
                    'success' => true,
                    'data' => $data
                ]);
            }

            // Default: get all siswa with the specified status
            $query = Siswa::with(['kelas', 'kelasHistory.kelas', 'kelasHistory.tahunAjaran'])
                ->where('status', $status)
                ->orderBy('nama')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $query
            ]);
        }

        // If tahun_ajaran_id is provided, get siswa from pivot table
        if ($tahunAjaranId) {
            $siswaKelas = SiswaKelas::where('tahun_ajaran_id', $tahunAjaranId)
                ->whereIn('status', ['Aktif', 'Naik', 'Tinggal', 'Lulus'])
                ->with(['siswa', 'kelas'])
                ->get()
                // Only filter out records where siswa doesn't exist
                ->filter(function ($sk) {
                    return $sk->siswa !== null;
                });

            // Transform data to include kelas for this specific tahun
            $data = $siswaKelas->map(function ($sk) {
                $siswa = $sk->siswa->toArray();
                // Override kelas with the one from this tahun_ajaran
                $siswa['kelas'] = $sk->kelas;
                $siswa['kelas_id'] = $sk->kelas_id;
                $siswa['pivot_status'] = $sk->status;
                return $siswa;
            })->values();

            return response()->json([
                'success' => true,
                'data' => $data
            ]);
        }

        // Default: return all siswa with their direct kelas relation
        $siswa = Siswa::with(['kelas', 'kelasHistory.kelas', 'kelasHistory.tahunAjaran'])
            ->orderBy('nama')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $siswa
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nama' => 'required|string|max:100',
            'status' => 'required|in:Aktif,Tidak Aktif,Alumni,Mutasi',
            'nis' => 'required|string|max:20|unique:siswa,nis',
            'nisn' => 'nullable|string|max:20|unique:siswa,nisn',
            'kelas_id' => 'required|exists:kelas,id',
            'jenis_kelamin' => 'required|in:L,P',
            'alamat' => 'nullable|string',
            'tanggal_lahir' => 'nullable|date',
            'tempat_lahir' => 'nullable|string|max:100',
            'asal_sekolah' => 'nullable|string|max:100',
            'nama_ayah' => 'nullable|string|max:100',
            'nama_ibu' => 'nullable|string|max:100',
            'kontak_ortu' => 'nullable|string|max:20',
            'tahun_ajaran_id' => 'nullable|exists:tahun_ajaran,id',
        ]);

        $siswa = Siswa::create($validated);
        $siswa->load('kelas');

        // Also create entry in pivot table
        $kelas = \App\Models\Kelas::find($validated['kelas_id']);
        if ($kelas) {
            SiswaKelas::create([
                'siswa_id' => $siswa->id,
                'kelas_id' => $validated['kelas_id'],
                'tahun_ajaran_id' => $validated['tahun_ajaran_id'] ?? $kelas->tahun_ajaran_id,
                'status' => 'Aktif'
            ]);
        }

        // Log activity
        ActivityLog::logCreate($siswa, "Menambahkan siswa: {$siswa->nama}");

        return response()->json([
            'success' => true,
            'message' => 'Siswa berhasil ditambahkan',
            'data' => $siswa
        ], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Siswa $siswa): JsonResponse
    {
        $siswa->load('kelas');
        return response()->json([
            'success' => true,
            'data' => $siswa
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Siswa $siswa): JsonResponse
    {
        $validated = $request->validate([
            'nama' => 'required|string|max:100',
            'status' => 'required|in:Aktif,Tidak Aktif',
            'nis' => 'required|string|max:20|unique:siswa,nis,' . $siswa->id,
            'nisn' => 'nullable|string|max:20|unique:siswa,nisn,' . $siswa->id,
            'kelas_id' => 'required|exists:kelas,id',
            'jenis_kelamin' => 'required|in:L,P',
            'alamat' => 'nullable|string',
            'tanggal_lahir' => 'nullable|date',
            'tempat_lahir' => 'nullable|string|max:100',
            'asal_sekolah' => 'nullable|string|max:100',
            'nama_ayah' => 'nullable|string|max:100',
            'nama_ibu' => 'nullable|string|max:100',
            'kontak_ortu' => 'nullable|string|max:20',
        ]);

        // Capture old values for logging
        $oldValues = $siswa->getOriginal();

        $siswa->update($validated);
        $siswa->load('kelas');

        // Log activity
        ActivityLog::logUpdate($siswa, $oldValues, "Mengubah data siswa: {$siswa->nama}");

        return response()->json([
            'success' => true,
            'message' => 'Siswa berhasil diperbarui',
            'data' => $siswa
        ]);
    }

    /**
     * Remove the specified resource from storage.
     * Checks for related records before deleting.
     */
    public function destroy(Request $request, Siswa $siswa): JsonResponse
    {
        $relatedCounts = $this->countSiswaRelatedRecords($siswa->id);
        $totalRelated = array_sum($relatedCounts);

        if ($totalRelated > 0 && !$request->boolean('force')) {
            return response()->json([
                'success' => false,
                'message' => "Siswa ini memiliki data terkait (kelas, absensi, tagihan) yang akan ikut terhapus. Gunakan opsi \"Hapus Paksa\" untuk melanjutkan.",
                'requires_force' => true,
                'related_counts' => $relatedCounts,
            ], 409);
        }

        // Log activity before delete
        ActivityLog::logDelete($siswa, "Menghapus siswa: {$siswa->nama}");

        $siswa->delete();

        return response()->json([
            'success' => true,
            'message' => 'Siswa berhasil dihapus'
        ]);
    }

    /**
     * Remove multiple resources from storage.
     * Checks for related records before deleting.
     */
    public function bulkDelete(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'exists:siswa,id',
            'force' => 'sometimes|boolean',
        ]);

        if (!$request->boolean('force')) {
            $totalRelated = 0;
            foreach ($validated['ids'] as $siswaId) {
                $totalRelated += array_sum($this->countSiswaRelatedRecords($siswaId));
            }

            if ($totalRelated > 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'Beberapa siswa memiliki data terkait yang akan ikut terhapus. Gunakan opsi "Hapus Paksa" untuk melanjutkan.',
                    'requires_force' => true,
                ], 409);
            }
        }

        // Log activity
        $siswaRecords = Siswa::whereIn('id', $validated['ids'])->get();
        foreach ($siswaRecords as $siswa) {
            ActivityLog::logDelete($siswa, "Menghapus siswa (bulk): {$siswa->nama}");
        }

        $count = Siswa::whereIn('id', $validated['ids'])->delete();

        return response()->json([
            'success' => true,
            'message' => "$count siswa berhasil dihapus"
        ]);
    }

    /**
     * Count related records for a siswa.
     */
    private function countSiswaRelatedRecords(int $siswaId): array
    {
        return [
            'siswa_kelas' => SiswaKelas::where('siswa_id', $siswaId)->count(),
            'absensi_siswa' => DB::table('absensi_siswa')->where('siswa_id', $siswaId)->count(),
            'tagihan_siswa' => DB::table('tagihan_siswa')->where('siswa_id', $siswaId)->count(),
        ];
    }
}
