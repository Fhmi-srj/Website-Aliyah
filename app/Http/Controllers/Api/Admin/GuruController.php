<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Guru;
use App\Models\User;
use App\Models\Role;
use App\Models\ActivityLog;
use App\Models\Jadwal;
use App\Models\AbsensiMengajar;
use App\Models\Kegiatan;
use App\Models\Rapat;
use App\Models\Supervisi;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

class GuruController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(): JsonResponse
    {
        $guru = Guru::with(['user:id,name,username,is_active', 'user.roles:id,name,display_name'])
            ->orderBy('nama')
            ->get()
            ->map(function ($item) {
                // Add roles array for frontend display (jabatan)
                $item->roles = $item->user?->roles?->pluck('display_name')->toArray() ?? [];
                // Add TTD URL
                $item->ttd_url = $item->ttd ? asset('storage/' . $item->ttd) : null;
                return $item;
            });

        return response()->json([
            'success' => true,
            'data' => $guru
        ]);
    }

    /**
     * Store a newly created resource in storage.
     * Auto-creates user account with role "guru"
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'username' => 'required|string|max:50|unique:users,username',
            'password' => 'required|string|min:6',
            'nama' => 'required|string|max:100',
            'nip' => 'nullable|string|max:50|unique:guru,nip',
            'email' => 'nullable|email|max:100',
            'sk' => 'nullable|string|max:50',
            'jenis_kelamin' => 'required|in:L,P',
            'tempat_lahir' => 'nullable|string|max:100',
            'tanggal_lahir' => 'nullable|date',
            'alamat' => 'nullable|string',
            'pendidikan' => 'nullable|string|max:100',
            'kontak' => 'nullable|string|max:20',
            'tmt' => 'nullable|date',
            'jabatan' => 'nullable|string|max:100',
            'status' => 'required|in:Aktif,Tidak Aktif',
        ]);

        try {
            DB::beginTransaction();

            // 1. Create user account
            $user = User::create([
                'name' => $validated['nama'],
                'username' => $validated['username'],
                'password' => Hash::make($validated['password']),
                'is_active' => $validated['status'] === 'Aktif',
            ]);

            // 2. Assign "guru" role to user
            $guruRole = Role::where('name', 'guru')->first();
            if ($guruRole) {
                $user->roles()->attach($guruRole->id);
            }

            // 3. Create guru profile linked to user
            $guru = Guru::create([
                'user_id' => $user->id,
                'username' => $validated['username'],
                'password' => Hash::make($validated['password']),
                'nama' => $validated['nama'],
                'nip' => $validated['nip'] ?? null,
                'email' => $validated['email'] ?? null,
                'sk' => $validated['sk'] ?? null,
                'jenis_kelamin' => $validated['jenis_kelamin'],
                'tempat_lahir' => $validated['tempat_lahir'] ?? null,
                'tanggal_lahir' => $validated['tanggal_lahir'] ?? null,
                'alamat' => $validated['alamat'] ?? null,
                'pendidikan' => $validated['pendidikan'] ?? null,
                'kontak' => $validated['kontak'] ?? null,
                'tmt' => $validated['tmt'] ?? null,
                'jabatan' => $validated['jabatan'] ?? null,
                'status' => $validated['status'],
            ]);

            // Log activity
            ActivityLog::logCreate($guru, "Menambahkan guru: {$guru->nama}");

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Guru dan akun user berhasil dibuat',
                'data' => $guru->load('user')
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Gagal membuat guru: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(Guru $guru): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $guru->load('user')
        ]);
    }

    /**
     * Update the specified resource in storage.
     * Also updates linked user account
     */
    public function update(Request $request, Guru $guru): JsonResponse
    {
        $validated = $request->validate([
            'username' => 'required|string|max:50|unique:users,username,' . ($guru->user_id ?? 0),
            'password' => 'nullable|string|min:6',
            'nama' => 'required|string|max:100',
            'nip' => 'nullable|string|max:50|unique:guru,nip,' . $guru->id,
            'email' => 'nullable|email|max:100',
            'sk' => 'nullable|string|max:50',
            'jenis_kelamin' => 'required|in:L,P',
            'tempat_lahir' => 'nullable|string|max:100',
            'tanggal_lahir' => 'nullable|date',
            'alamat' => 'nullable|string',
            'pendidikan' => 'nullable|string|max:100',
            'kontak' => 'nullable|string|max:20',
            'tmt' => 'nullable|date',
            'jabatan' => 'nullable|string|max:100',
            'status' => 'required|in:Aktif,Tidak Aktif',
        ]);

        try {
            DB::beginTransaction();

            // Capture old values before update
            $oldValues = $guru->getOriginal();

            // Update linked user if exists
            if ($guru->user_id && $guru->user) {
                $userUpdate = [
                    'name' => $validated['nama'],
                    'username' => $validated['username'],
                    'is_active' => $validated['status'] === 'Aktif',
                ];

                if (!empty($validated['password'])) {
                    $userUpdate['password'] = Hash::make($validated['password']);
                }

                $guru->user->update($userUpdate);
            }

            // Update guru profile
            $guruUpdate = $validated;
            if (!empty($validated['password'])) {
                $guruUpdate['password'] = Hash::make($validated['password']);
            } else {
                unset($guruUpdate['password']);
            }

            $guru->update($guruUpdate);

            // Log activity
            ActivityLog::logUpdate($guru, $oldValues, "Mengubah data guru: {$guru->nama}");

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Guru berhasil diperbarui',
                'data' => $guru->load('user')
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Gagal memperbarui guru: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove the specified resource from storage.
     * Checks for related records before deleting to prevent cascading data loss.
     * Use ?force=true to delete even with related records.
     */
    public function destroy(Request $request, Guru $guru): JsonResponse
    {
        try {
            DB::beginTransaction();

            // Count related records that would be affected
            $relatedCounts = $this->countRelatedRecords($guru->id);
            $totalRelated = array_sum($relatedCounts);

            // If related records exist and force is not set, warn user
            if ($totalRelated > 0 && !$request->boolean('force')) {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'message' => 'Guru memiliki data terkait yang akan ikut terhapus. Gunakan opsi "Hapus Paksa" untuk melanjutkan.',
                    'requires_force' => true,
                    'related_counts' => $relatedCounts,
                ], 409);
            }

            // Clean up JSON references in kegiatan and rapat before deleting
            $this->cleanupJsonReferences($guru->id);

            // Deactivate linked user instead of deleting
            if ($guru->user_id && $guru->user) {
                $guru->user->update(['is_active' => false]);
            }

            // Log activity before delete
            ActivityLog::logDelete($guru, "Menghapus guru: {$guru->nama}");

            $guru->delete();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Guru berhasil dihapus'
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Gagal menghapus guru: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Link existing guru to existing user
     */
    public function linkUser(Request $request, Guru $guru): JsonResponse
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id'
        ]);

        try {
            $guru->update(['user_id' => $validated['user_id']]);

            // Ensure user has guru role
            $user = User::find($validated['user_id']);
            $guruRole = Role::where('name', 'guru')->first();
            if ($guruRole && !$user->hasRole('guru')) {
                $user->roles()->attach($guruRole->id);
            }

            return response()->json([
                'success' => true,
                'message' => 'Guru berhasil dihubungkan dengan user',
                'data' => $guru->load('user')
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal menghubungkan: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove multiple resources from storage.
     * Checks for related records before deleting.
     */
    public function bulkDelete(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'exists:guru,id',
            'force' => 'sometimes|boolean',
        ]);

        try {
            DB::beginTransaction();

            // Count total related records across all selected guru
            if (!$request->boolean('force')) {
                $totalRelated = 0;
                $summary = [];
                foreach ($validated['ids'] as $guruId) {
                    $counts = $this->countRelatedRecords($guruId);
                    $sum = array_sum($counts);
                    if ($sum > 0) {
                        $guru = Guru::find($guruId);
                        $summary[] = ($guru->nama ?? "ID:$guruId") . " ($sum data terkait)";
                    }
                    $totalRelated += $sum;
                }

                if ($totalRelated > 0) {
                    DB::rollBack();
                    return response()->json([
                        'success' => false,
                        'message' => 'Beberapa guru memiliki data terkait yang akan ikut terhapus: ' . implode(', ', array_slice($summary, 0, 5)),
                        'requires_force' => true,
                    ], 409);
                }
            }

            $guruRecords = Guru::whereIn('id', $validated['ids'])->get();

            // Clean up JSON references for each guru
            foreach ($validated['ids'] as $guruId) {
                $this->cleanupJsonReferences($guruId);
            }

            // Deactivate linked user accounts
            $userIds = $guruRecords->pluck('user_id')->filter()->toArray();
            if (!empty($userIds)) {
                User::whereIn('id', $userIds)->update(['is_active' => false]);
            }

            // Log activity
            foreach ($guruRecords as $guru) {
                ActivityLog::logDelete($guru, "Menghapus guru (bulk): {$guru->nama}");
            }

            // Delete guru records
            $count = Guru::whereIn('id', $validated['ids'])->delete();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => "$count guru berhasil dihapus"
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Gagal menghapus: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Upload TTD (signature) for a guru
     */
    public function uploadTtd(Request $request, Guru $guru): JsonResponse
    {
        // Accept either file upload or base64
        if (!$request->hasFile('ttd') && !$request->input('ttd_base64')) {
            return response()->json(['message' => 'TTD file atau base64 data diperlukan'], 422);
        }

        try {
            // Delete old TTD if exists
            if ($guru->ttd && \Storage::disk('public')->exists($guru->ttd)) {
                \Storage::disk('public')->delete($guru->ttd);
            }

            $path = null; // Initialize path variable

            if ($request->input('ttd_base64')) {
                // Handle base64 canvas data
                $base64 = $request->input('ttd_base64');
                $base64 = preg_replace('/^data:image\/\w+;base64,/', '', $base64);
                $imageData = base64_decode($base64);
                if (!$imageData) {
                    return response()->json(['message' => 'Data base64 tidak valid'], 422);
                }
                $filename = 'ttd_' . $guru->id . '_' . time() . '.png';
                $path = 'ttd/guru/' . $filename;
                \Storage::disk('public')->put($path, $imageData);
            } else {
                // Handle file upload
                $request->validate([
                    'ttd' => 'required|image|mimes:jpeg,png,jpg,gif|max:2048'
                ]);
                $file = $request->file('ttd');
                $extension = $file->getClientOriginalExtension() ?: 'png';
                $filename = 'ttd_' . $guru->id . '_' . time() . '.' . $extension;
                $path = $file->storeAs('ttd/guru', $filename, 'public');
            }

            if (!$path) {
                return response()->json(['message' => 'Gagal menyimpan TTD'], 500);
            }

            $guru->update(['ttd' => $path]);

            return response()->json([
                'success' => true,
                'message' => 'Tanda tangan guru berhasil diperbarui',
                'ttd_url' => asset('storage/' . $path),
                'ttd' => $path
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal mengupload TTD: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Count related records that would be affected by guru deletion.
     */
    private function countRelatedRecords(int $guruId): array
    {
        return [
            'jadwal' => Jadwal::where('guru_id', $guruId)->count(),
            'absensi_mengajar' => AbsensiMengajar::where('guru_id', $guruId)->count(),
            'kegiatan_pj' => Kegiatan::where('penanggung_jawab_id', $guruId)->count(),
            'rapat_pimpinan' => Rapat::where('pimpinan_id', $guruId)->count(),
            'rapat_sekretaris' => Rapat::where('sekretaris_id', $guruId)->count(),
            'supervisi' => Supervisi::where('guru_id', $guruId)->orWhere('supervisor_id', $guruId)->count(),
        ];
    }

    /**
     * Clean up JSON references to a guru in kegiatan and rapat tables.
     * Removes the guru_id from JSON arrays so they don't become stale.
     */
    private function cleanupJsonReferences(int $guruId): void
    {
        // Clean kegiatan.guru_pendamping
        $kegiatans = Kegiatan::whereJsonContains('guru_pendamping', $guruId)->get();
        foreach ($kegiatans as $kegiatan) {
            $pendamping = $kegiatan->guru_pendamping ?? [];
            $pendamping = array_values(array_filter($pendamping, fn($id) => (int)$id !== $guruId));
            $kegiatan->update(['guru_pendamping' => $pendamping]);
        }

        // Clean rapat.peserta_rapat
        $rapats = Rapat::whereJsonContains('peserta_rapat', $guruId)->get();
        foreach ($rapats as $rapat) {
            $peserta = $rapat->peserta_rapat ?? [];
            $peserta = array_values(array_filter($peserta, fn($id) => (int)$id !== $guruId));
            $rapat->update(['peserta_rapat' => $peserta]);
        }
    }
}
