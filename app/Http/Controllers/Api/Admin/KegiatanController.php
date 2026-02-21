<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Kegiatan;
use App\Models\Kalender;
use App\Models\Guru;
use App\Models\Kelas;
use App\Models\TahunAjaran;
use App\Models\ActivityLog;
use App\Models\AbsensiKegiatan;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class KegiatanController extends Controller
{
    /**
     * Get the active tahun ajaran ID for the current user.
     */
    private function getActiveTahunAjaranId(Request $request): ?int
    {
        $user = $request->user();
        if ($user && $user->tahun_ajaran_id) {
            return $user->tahun_ajaran_id;
        }
        $current = TahunAjaran::getCurrent();
        return $current ? $current->id : null;
    }

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): JsonResponse
    {
        $tahunAjaranId = $request->query('tahun_ajaran_id') ?? $this->getActiveTahunAjaranId($request);

        $query = Kegiatan::with(['penanggungjawab:id,nama', 'tahunAjaran:id,nama', 'absensiKegiatan:id,kegiatan_id', 'kalender:id,kegiatan_id,status_kbm'])
            ->withCount('absensiKegiatan');

        if ($tahunAjaranId) {
            $query->where('tahun_ajaran_id', $tahunAjaranId);
        }

        $kegiatan = $query->orderBy('waktu_mulai', 'desc')
            ->get()
            ->map(function ($item) {
                // Add guru pendamping names
                $guruPendampingNames = [];
                if (!empty($item->guru_pendamping)) {
                    $guruPendampingNames = Guru::whereIn('id', $item->guru_pendamping)
                        ->pluck('nama')
                        ->toArray();
                }
                $item->guru_pendamping_names = $guruPendampingNames;

                // Add kelas peserta names
                $kelasPesertaNames = [];
                if (!empty($item->kelas_peserta)) {
                    $kelasPesertaNames = Kelas::whereIn('id', $item->kelas_peserta)
                        ->pluck('nama_kelas')
                        ->toArray();
                }
                $item->kelas_peserta_names = $kelasPesertaNames;

                // Add absensi info for print functionality
                $firstAbsensi = $item->absensiKegiatan->first();
                $item->absensi_id = $firstAbsensi?->id;
                $item->has_absensi = $firstAbsensi && $firstAbsensi->status === 'submitted';

                return $item;
            });

        return response()->json([
            'success' => true,
            'data' => $kegiatan
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        try {
            // Cast array values to integers and filter out invalid values before validation
            if ($request->has('guru_pendamping') && is_array($request->guru_pendamping)) {
                $gpIds = array_filter(array_map('intval', $request->guru_pendamping), fn($v) => $v > 0);
                $validGpIds = Guru::whereIn('id', $gpIds)->pluck('id')->toArray();
                $request->merge(['guru_pendamping' => array_values($validGpIds)]);
            }
            if ($request->has('kelas_peserta') && is_array($request->kelas_peserta)) {
                $kpIds = array_filter(array_map('intval', $request->kelas_peserta), fn($v) => $v > 0);
                $validKpIds = Kelas::whereIn('id', $kpIds)->pluck('id')->toArray();
                $request->merge(['kelas_peserta' => array_values($validKpIds)]);
            }

            $validated = $request->validate([
                'nama_kegiatan' => 'required|string|max:200',
                'jenis_kegiatan' => 'required|in:Rutin,Tahunan,Insidental,Reguler',
                'waktu_mulai' => 'required|date',
                'waktu_berakhir' => 'required|date|after_or_equal:waktu_mulai',
                'tempat' => 'nullable|string|max:100',
                'penanggung_jawab_id' => 'nullable|exists:guru,id',
                'guru_pendamping' => 'nullable|array',
                'guru_pendamping.*' => 'integer',
                'kelas_peserta' => 'nullable|array',
                'kelas_peserta.*' => 'integer',
                'peserta' => 'nullable|string|max:100',
                'deskripsi' => 'nullable|string|max:500',
                'status' => 'required|in:Aktif,Selesai,Dibatalkan',
                'tahun_ajaran_id' => 'nullable|exists:tahun_ajaran,id',
                'kalender_id' => 'nullable|exists:kalender,id',
            ]);

            DB::beginTransaction();

            // Auto-assign tahun_ajaran_id if not provided
            if (empty($validated['tahun_ajaran_id'])) {
                $validated['tahun_ajaran_id'] = $this->getActiveTahunAjaranId($request);
            }

            // Set penanggung_jawab based on penanggung_jawab_id
            if (!empty($validated['penanggung_jawab_id'])) {
                $guru = Guru::find($validated['penanggung_jawab_id']);
                $validated['penanggung_jawab'] = $guru ? $guru->nama : '-';
            } else {
                $validated['penanggung_jawab'] = '-';
            }

            // Generate peserta text from kelas names
            if (!empty($validated['kelas_peserta'])) {
                $kelasNames = Kelas::whereIn('id', $validated['kelas_peserta'])->pluck('nama_kelas')->toArray();
                $validated['peserta'] = implode(', ', $kelasNames);
            }

            $kegiatan = Kegiatan::create($validated);

            // Link to existing or create new calendar entry
            if (!empty($validated['kalender_id'])) {
                $kalender = Kalender::find($validated['kalender_id']);
                if ($kalender) {
                    $kalender->update([
                        'kegiatan_id' => $kegiatan->id,
                        'kegiatan' => $validated['nama_kegiatan'],
                        'tanggal_mulai' => date('Y-m-d H:i:s', strtotime($validated['waktu_mulai'])),
                        'tanggal_berakhir' => date('Y-m-d H:i:s', strtotime($validated['waktu_berakhir'])),
                        'tempat' => $validated['tempat'] ?? null,
                        'guru_id' => $validated['penanggung_jawab_id'] ?? null,
                        'status_kbm' => $validated['status'],
                    ]);
                }
            } else {
                Kalender::create([
                    'tanggal_mulai' => date('Y-m-d H:i:s', strtotime($validated['waktu_mulai'])),
                    'tanggal_berakhir' => date('Y-m-d H:i:s', strtotime($validated['waktu_berakhir'])),
                    'kegiatan' => $validated['nama_kegiatan'],
                    'status_kbm' => $validated['status'],
                    'tempat' => $validated['tempat'] ?? null,
                    'guru_id' => $validated['penanggung_jawab_id'] ?? null,
                    'kegiatan_id' => $kegiatan->id,
                    'keterangan' => 'Kegiatan',
                    'tahun_ajaran_id' => $validated['tahun_ajaran_id'],
                ]);
            }

            DB::commit();

            $kegiatan->load('penanggungjawab:id,nama');

            return response()->json([
                'success' => true,
                'message' => 'Kegiatan berhasil ditambahkan',
                'data' => $kegiatan
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            DB::rollBack();
            $firstError = collect($e->errors())->flatten()->first();
            return response()->json([
                'success' => false,
                'message' => $firstError ?? 'Validasi gagal'
            ], 422);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(Kegiatan $kegiatan): JsonResponse
    {
        $kegiatan->load('penanggungjawab:id,nama');
        return response()->json([
            'success' => true,
            'data' => $kegiatan
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Kegiatan $kegiatan): JsonResponse
    {
        try {
            // Cast array values to integers and filter out invalid (0, null) values before validation
            if ($request->has('guru_pendamping') && is_array($request->guru_pendamping)) {
                $gpIds = array_filter(array_map('intval', $request->guru_pendamping), fn($v) => $v > 0);
                // Only keep IDs that actually exist in guru table
                $validGpIds = Guru::whereIn('id', $gpIds)->pluck('id')->toArray();
                $request->merge(['guru_pendamping' => array_values($validGpIds)]);
            }
            if ($request->has('kelas_peserta') && is_array($request->kelas_peserta)) {
                $kpIds = array_filter(array_map('intval', $request->kelas_peserta), fn($v) => $v > 0);
                // Only keep IDs that actually exist in kelas table
                $validKpIds = Kelas::whereIn('id', $kpIds)->pluck('id')->toArray();
                $request->merge(['kelas_peserta' => array_values($validKpIds)]);
            }

            $validated = $request->validate([
                'nama_kegiatan' => 'required|string|max:200',
                'jenis_kegiatan' => 'required|in:Rutin,Tahunan,Insidental,Reguler',
                'waktu_mulai' => 'required|date',
                'waktu_berakhir' => 'required|date|after_or_equal:waktu_mulai',
                'tempat' => 'nullable|string|max:100',
                'penanggung_jawab_id' => 'nullable|exists:guru,id',
                'guru_pendamping' => 'nullable|array',
                'guru_pendamping.*' => 'integer',
                'kelas_peserta' => 'nullable|array',
                'kelas_peserta.*' => 'integer',
                'peserta' => 'nullable|string|max:100',
                'deskripsi' => 'nullable|string|max:500',
                'status' => 'required|in:Aktif,Libur',
            ]);

            DB::beginTransaction();

            // Capture old values for logging
            $oldValues = $kegiatan->getOriginal();

            // Set penanggung_jawab based on penanggung_jawab_id
            if (!empty($validated['penanggung_jawab_id'])) {
                $guru = Guru::find($validated['penanggung_jawab_id']);
                $validated['penanggung_jawab'] = $guru ? $guru->nama : '-';
            } else {
                $validated['penanggung_jawab'] = '-';
            }

            // Generate peserta text from kelas names
            if (!empty($validated['kelas_peserta'])) {
                $kelasNames = Kelas::whereIn('id', $validated['kelas_peserta'])->pluck('nama_kelas')->toArray();
                $validated['peserta'] = implode(', ', $kelasNames);
            }

            $kegiatan->update($validated);

            // Update linked kalender entry if exists
            $linkedKalender = Kalender::where('kegiatan_id', $kegiatan->id)->first() ?? ($kegiatan->kalender_id ? Kalender::find($kegiatan->kalender_id) : null);
            if ($linkedKalender) {
                // Sync essential fields (Name, Dates, PJ)
                $linkedKalender->update([
                    'tanggal_mulai' => date('Y-m-d H:i:s', strtotime($validated['waktu_mulai'])),
                    'tanggal_berakhir' => date('Y-m-d H:i:s', strtotime($validated['waktu_berakhir'])),
                    'kegiatan' => $validated['nama_kegiatan'],
                    'tempat' => $validated['tempat'] ?? null,
                    'guru_id' => $validated['penanggung_jawab_id'] ?? null,
                    'status_kbm' => $validated['status'],
                ]);

                // If we found it via kalender_id but it wasn't linked via kegiatan_id, link it now
                if (!$linkedKalender->kegiatan_id) {
                    $linkedKalender->update(['kegiatan_id' => $kegiatan->id]);
                }
            }

            DB::commit();

            $kegiatan->load('penanggungjawab:id,nama');

            return response()->json([
                'success' => true,
                'message' => 'Kegiatan berhasil diperbarui',
                'data' => $kegiatan
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            DB::rollBack();
            $firstError = collect($e->errors())->flatten()->first();
            return response()->json([
                'success' => false,
                'message' => $firstError ?? 'Validasi gagal'
            ], 422);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove the specified resource from storage.
     * Checks for related absensi records before deleting.
     */
    public function destroy(Request $request, Kegiatan $kegiatan): JsonResponse
    {
        DB::beginTransaction();
        try {
            $absensiCount = AbsensiKegiatan::where('kegiatan_id', $kegiatan->id)->count();

            if ($absensiCount > 0 && !$request->boolean('force')) {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'message' => "Kegiatan ini memiliki {$absensiCount} data absensi yang akan ikut terhapus. Gunakan opsi \"Hapus Paksa\" untuk melanjutkan.",
                    'requires_force' => true,
                    'related_counts' => ['absensi_kegiatan' => $absensiCount],
                ], 409);
            }

            // Delete linked kalender entry
            Kalender::where('kegiatan_id', $kegiatan->id)->delete();

            // Log activity before delete
            ActivityLog::logDelete($kegiatan, "Menghapus kegiatan: {$kegiatan->nama_kegiatan}");

            $kegiatan->delete();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Kegiatan berhasil dihapus'
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Bulk delete kegiatan entries.
     * Checks for related absensi records before deleting.
     */
    public function bulkDelete(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'exists:kegiatan,id',
            'force' => 'sometimes|boolean',
        ]);

        DB::beginTransaction();
        try {
            $absensiCount = AbsensiKegiatan::whereIn('kegiatan_id', $validated['ids'])->count();

            if ($absensiCount > 0 && !$request->boolean('force')) {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'message' => "Beberapa kegiatan memiliki {$absensiCount} data absensi yang akan ikut terhapus. Gunakan opsi \"Hapus Paksa\" untuk melanjutkan.",
                    'requires_force' => true,
                    'related_counts' => ['absensi_kegiatan' => $absensiCount],
                ], 409);
            }

            // Delete linked kalender entries
            Kalender::whereIn('kegiatan_id', $validated['ids'])->delete();

            // Delete kegiatan entries
            Kegiatan::whereIn('id', $validated['ids'])->delete();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => count($validated['ids']) . ' kegiatan berhasil dihapus'
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Bulk update jenis kegiatan.
     */
    public function bulkUpdateJenis(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'exists:kegiatan,id',
            'jenis_kegiatan' => 'required|in:Rutin,Tahunan,Insidental'
        ]);

        try {
            Kegiatan::whereIn('id', $validated['ids'])->update(['jenis_kegiatan' => $validated['jenis_kegiatan']]);

            return response()->json([
                'success' => true,
                'message' => count($validated['ids']) . ' kegiatan berhasil diubah menjadi ' . $validated['jenis_kegiatan']
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }
}
