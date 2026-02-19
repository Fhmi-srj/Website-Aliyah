<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Kelas;
use App\Models\Guru;
use App\Models\Role;
use App\Models\Jadwal;
use App\Models\SiswaKelas;
use App\Models\Siswa;
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

            // Auto-sync wali_kelas role
            if ($validated['wali_kelas_id'] ?? null) {
                $this->syncWaliKelasRole($validated['wali_kelas_id']);
            }

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
            // Get the original ID and old wali_kelas_id before any operations
            $kelasId = $kelas->id;
            $oldWaliKelasId = $kelas->wali_kelas_id;

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
            $newWaliKelasId = $validated['wali_kelas_id'] ?? null;

            // Use DB query to update directly
            Kelas::where('id', $kelasId)->update($validated);

            // Auto-sync wali_kelas role when wali kelas changes
            if ($oldWaliKelasId != $newWaliKelasId) {
                // Assign role to new wali kelas
                if ($newWaliKelasId) {
                    $this->syncWaliKelasRole($newWaliKelasId);
                }
                // Remove role from old wali kelas if no longer wali kelas of any class
                if ($oldWaliKelasId) {
                    $this->removeWaliKelasRoleIfOrphan($oldWaliKelasId);
                }
            }

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
     * Checks for related records before deleting.
     */
    public function destroy(Request $request, Kelas $kelas): JsonResponse
    {
        // Count related records
        $relatedCounts = [
            'siswa' => Siswa::where('kelas_id', $kelas->id)->count(),
            'siswa_kelas' => SiswaKelas::where('kelas_id', $kelas->id)->count(),
            'jadwal' => Jadwal::where('kelas_id', $kelas->id)->count(),
        ];
        $totalRelated = array_sum($relatedCounts);

        if ($totalRelated > 0 && !$request->boolean('force')) {
            return response()->json([
                'success' => false,
                'message' => "Kelas ini memiliki data terkait (siswa, jadwal) yang akan ikut terhapus. Gunakan opsi \"Hapus Paksa\" untuk melanjutkan.",
                'requires_force' => true,
                'related_counts' => $relatedCounts,
            ], 409);
        }

        $oldWaliKelasId = $kelas->wali_kelas_id;

        $kelas->delete();

        // Remove wali_kelas role if guru is no longer wali kelas of any class
        if ($oldWaliKelasId) {
            $this->removeWaliKelasRoleIfOrphan($oldWaliKelasId);
        }

        return response()->json([
            'success' => true,
            'message' => 'Kelas berhasil dihapus'
        ]);
    }

    /**
     * Auto-assign wali_kelas role to a guru's user account
     */
    private function syncWaliKelasRole(int $guruId): void
    {
        $guru = Guru::find($guruId);
        if (!$guru || !$guru->user_id)
            return;

        $role = Role::where('name', 'wali_kelas')->first();
        if (!$role)
            return;

        $user = $guru->user;
        if ($user && !$user->roles()->where('roles.id', $role->id)->exists()) {
            $user->roles()->attach($role->id);
        }
    }

    /**
     * Remove wali_kelas role from guru if they are no longer wali kelas of any class
     */
    private function removeWaliKelasRoleIfOrphan(int $guruId): void
    {
        // Check if this guru is still wali kelas of any other class
        $stillWaliKelas = Kelas::where('wali_kelas_id', $guruId)->exists();
        if ($stillWaliKelas)
            return;

        $guru = Guru::find($guruId);
        if (!$guru || !$guru->user_id)
            return;

        $role = Role::where('name', 'wali_kelas')->first();
        if (!$role)
            return;

        $user = $guru->user;
        if ($user) {
            $user->roles()->detach($role->id);
        }
    }
}
