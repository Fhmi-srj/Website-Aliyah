<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Kalender;
use App\Models\Kegiatan;
use App\Models\ActivityLog;
use App\Models\TahunAjaran;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class KalenderController extends Controller
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
    public function index(Request $request)
    {
        $tahunAjaranId = $request->query('tahun_ajaran_id') ?? $this->getActiveTahunAjaranId($request);

        $query = Kalender::with(['guru:id,nama', 'kegiatanRef'])
            ->orderBy('tanggal_mulai', 'desc');

        if ($tahunAjaranId) {
            $query->where('tahun_ajaran_id', $tahunAjaranId);
        }

        $kalender = $query->get();

        return response()->json([
            'success' => true,
            'data' => $kalender
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'tanggal_mulai' => 'required|date',
            'tanggal_berakhir' => 'nullable|date|after_or_equal:tanggal_mulai',
            'kegiatan' => 'required|string|max:255',
            'tempat' => 'nullable|string|max:255',
            'status_kbm' => 'required|in:Aktif,Libur',
            'guru_id' => 'nullable|exists:guru,id',
            'keterangan' => 'required|in:Kegiatan,Keterangan',
            'rab' => 'nullable|numeric|min:0',
            'tahun_ajaran_id' => 'nullable|exists:tahun_ajaran,id',
            'jenis_kegiatan' => 'nullable|in:Rutin,Tahunan,Insidental',
            'guru_pendamping' => 'nullable|array',
            'guru_pendamping.*' => 'exists:guru,id',
            'kelas_peserta' => 'nullable|array',
            'kelas_peserta.*' => 'exists:kelas,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $validator->errors()
            ], 422);
        }

        DB::beginTransaction();
        try {
            $kalenderData = $request->only([
                'tanggal_mulai',
                'tanggal_berakhir',
                'kegiatan',
                'tempat',
                'status_kbm',
                'guru_id',
                'keterangan',
                'rab'
            ]);
            $kegiatanId = null;

            // Auto-assign tahun_ajaran_id if not provided
            $tahunAjaranId = $request->tahun_ajaran_id ?? $this->getActiveTahunAjaranId($request);
            $kalenderData['tahun_ajaran_id'] = $tahunAjaranId;

            // If keterangan is "Kegiatan", create linked kegiatan entry
            if ($request->keterangan === 'Kegiatan') {
                // Get guru name if guru_id is provided
                $penanggungJawabNama = '';
                if ($request->guru_id) {
                    $guru = \App\Models\Guru::find($request->guru_id);
                    $penanggungJawabNama = $guru ? $guru->nama : '';
                }

                $kegiatan = Kegiatan::create([
                    'nama_kegiatan' => $request->kegiatan,
                    'jenis_kegiatan' => $request->jenis_kegiatan ?? 'Rutin',
                    'waktu_mulai' => $request->tanggal_mulai,
                    'waktu_berakhir' => $request->tanggal_berakhir ?? $request->tanggal_mulai,
                    'tempat' => $request->tempat,
                    'penanggung_jawab_id' => $request->guru_id,
                    'penanggung_jawab' => $penanggungJawabNama,
                    'guru_pendamping' => $request->guru_pendamping,
                    'kelas_peserta' => $request->kelas_peserta,
                    'status' => 'Aktif',
                    'status_kbm' => $request->status_kbm,
                    'tahun_ajaran_id' => $tahunAjaranId,
                ]);
                $kegiatanId = $kegiatan->id;
            }

            $kalenderData['kegiatan_id'] = $kegiatanId;
            $kalender = Kalender::create($kalenderData);

            // Log activity
            ActivityLog::logCreate($kalender, "Menambahkan kalender: {$kalender->kegiatan}");

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Data kalender berhasil ditambahkan',
                'data' => $kalender->load('guru:id,nama')
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(Kalender $kalender)
    {
        return response()->json([
            'success' => true,
            'data' => $kalender->load('guru:id,nama')
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Kalender $kalender)
    {
        $validator = Validator::make($request->all(), [
            'tanggal_mulai' => 'required|date',
            'tanggal_berakhir' => 'nullable|date|after_or_equal:tanggal_mulai',
            'kegiatan' => 'required|string|max:255',
            'tempat' => 'nullable|string|max:255',
            'status_kbm' => 'required|in:Aktif,Libur',
            'guru_id' => 'nullable|exists:guru,id',
            'keterangan' => 'required|in:Kegiatan,Keterangan',
            'rab' => 'nullable|numeric|min:0',
            'tahun_ajaran_id' => 'nullable|exists:tahun_ajaran,id',
            'jenis_kegiatan' => 'nullable|in:Rutin,Tahunan,Insidental',
            'guru_pendamping' => 'nullable|array',
            'guru_pendamping.*' => 'exists:guru,id',
            'kelas_peserta' => 'nullable|array',
            'kelas_peserta.*' => 'exists:kelas,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $validator->errors()
            ], 422);
        }

        DB::beginTransaction();
        try {
            $kalenderData = $request->only([
                'tanggal_mulai',
                'tanggal_berakhir',
                'kegiatan',
                'tempat',
                'status_kbm',
                'guru_id',
                'keterangan',
                'rab',
                'tahun_ajaran_id'
            ]);

            // Capture old values for logging
            $oldValues = $kalender->getOriginal();

            // Resolve guru name for kegiatan sync
            $penanggungJawabNama = '-';
            if ($request->guru_id) {
                $guru = \App\Models\Guru::find($request->guru_id);
                $penanggungJawabNama = $guru ? $guru->nama : '-';
            }

            // Handle kegiatan sync
            if ($request->keterangan === 'Kegiatan') {
                $kegiatanData = [
                    'nama_kegiatan' => $request->kegiatan,
                    'jenis_kegiatan' => $request->jenis_kegiatan ?? 'Rutin',
                    'waktu_mulai' => $request->tanggal_mulai,
                    'waktu_berakhir' => $request->tanggal_berakhir ?? $request->tanggal_mulai,
                    'tempat' => $request->tempat,
                    'penanggung_jawab_id' => $request->guru_id,
                    'penanggung_jawab' => $penanggungJawabNama,
                    'guru_pendamping' => $request->guru_pendamping,
                    'kelas_peserta' => $request->kelas_peserta,
                    'status_kbm' => $request->status_kbm,
                ];

                // If already linked to kegiatan, update it
                if ($kalender->kegiatan_id) {
                    $kegiatan = Kegiatan::find($kalender->kegiatan_id);
                    if ($kegiatan) {
                        $kegiatan->update($kegiatanData);
                    }
                } else {
                    // Create new kegiatan link
                    $kegiatanData['status'] = 'Aktif';
                    $kegiatanData['tahun_ajaran_id'] = $request->tahun_ajaran_id ?? $kalender->tahun_ajaran_id;
                    $kegiatan = Kegiatan::create($kegiatanData);
                    $kalenderData['kegiatan_id'] = $kegiatan->id;
                }
            } else {
                // Changed from "Kegiatan" to "Keterangan" — delete linked kegiatan if safe
                if ($kalender->kegiatan_id) {
                    $kegiatan = Kegiatan::find($kalender->kegiatan_id);
                    if ($kegiatan) {
                        // Only delete if no attendance records exist
                        $hasAbsensi = \App\Models\AbsensiKegiatan::where('kegiatan_id', $kegiatan->id)->exists();
                        if (!$hasAbsensi) {
                            $kegiatan->delete();
                        }
                    }
                    $kalenderData['kegiatan_id'] = null;
                }
                // Clear kegiatan-specific fields
                $kalenderData['guru_id'] = null;
                $kalenderData['tempat'] = null;
                $kalenderData['rab'] = null;
            }

            $kalender->update($kalenderData);

            // Log activity
            ActivityLog::logUpdate($kalender, $oldValues, "Mengubah kalender: {$kalender->kegiatan}");

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Data kalender berhasil diperbarui',
                'data' => $kalender->load('guru:id,nama')
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Kalender $kalender)
    {
        DB::beginTransaction();
        try {
            // Delete linked kegiatan if exists (cascade should handle this, but let's be explicit)
            if ($kalender->kegiatan_id) {
                Kegiatan::where('id', $kalender->kegiatan_id)->delete();
            }

            // Log activity before delete
            ActivityLog::logDelete($kalender, "Menghapus kalender: {$kalender->kegiatan}");

            $kalender->delete();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Data kalender berhasil dihapus'
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Bulk delete kalender entries.
     */
    public function bulkDelete(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'ids' => 'required|array|min:1',
            'ids.*' => 'exists:kalender,id'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $validator->errors()
            ], 422);
        }

        DB::beginTransaction();
        try {
            // Get kalender entries with kegiatan_id
            $kalenders = Kalender::whereIn('id', $request->ids)->get();

            // Delete linked kegiatan entries
            $kegiatanIds = $kalenders->whereNotNull('kegiatan_id')->pluck('kegiatan_id')->toArray();
            if (!empty($kegiatanIds)) {
                Kegiatan::whereIn('id', $kegiatanIds)->delete();
            }

            // Delete kalender entries
            Kalender::whereIn('id', $request->ids)->delete();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => count($request->ids) . ' data kalender berhasil dihapus'
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Bulk update status KBM.
     */
    public function bulkUpdateStatusKbm(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'ids' => 'required|array|min:1',
            'ids.*' => 'exists:kalender,id',
            'status_kbm' => 'required|in:Aktif,Libur'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            Kalender::whereIn('id', $request->ids)->update(['status_kbm' => $request->status_kbm]);

            return response()->json([
                'success' => true,
                'message' => count($request->ids) . ' data berhasil diubah status KBM-nya menjadi ' . $request->status_kbm
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Bulk update keterangan.
     */
    public function bulkUpdateKeterangan(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'ids' => 'required|array|min:1',
            'ids.*' => 'exists:kalender,id',
            'keterangan' => 'required|in:Kegiatan,Keterangan'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $validator->errors()
            ], 422);
        }

        DB::beginTransaction();
        try {
            $kalenders = Kalender::whereIn('id', $request->ids)->get();

            if ($request->keterangan === 'Keterangan') {
                // Changing to Keterangan — delete linked kegiatan records that have no absensi
                foreach ($kalenders as $kalender) {
                    if ($kalender->kegiatan_id) {
                        $hasAbsensi = \App\Models\AbsensiKegiatan::where('kegiatan_id', $kalender->kegiatan_id)->exists();
                        if (!$hasAbsensi) {
                            Kegiatan::where('id', $kalender->kegiatan_id)->delete();
                        }
                        $kalender->kegiatan_id = null;
                        $kalender->save();
                    }
                }
            } elseif ($request->keterangan === 'Kegiatan') {
                // Changing to Kegiatan — create linked kegiatan for items that don't have one
                foreach ($kalenders as $kalender) {
                    if (!$kalender->kegiatan_id) {
                        $penanggungJawabNama = '';
                        if ($kalender->guru_id) {
                            $guru = \App\Models\Guru::find($kalender->guru_id);
                            $penanggungJawabNama = $guru ? $guru->nama : '';
                        }

                        $kegiatan = Kegiatan::create([
                            'nama_kegiatan' => $kalender->kegiatan,
                            'jenis_kegiatan' => 'Rutin',
                            'waktu_mulai' => $kalender->tanggal_mulai,
                            'waktu_berakhir' => $kalender->tanggal_berakhir ?? $kalender->tanggal_mulai,
                            'tempat' => $kalender->tempat ?? null,
                            'penanggung_jawab_id' => $kalender->guru_id,
                            'penanggung_jawab' => $penanggungJawabNama ?: '-',
                            'status' => 'Aktif',
                            'status_kbm' => $kalender->status_kbm,
                            'tahun_ajaran_id' => $kalender->tahun_ajaran_id,
                        ]);
                        $kalender->kegiatan_id = $kegiatan->id;
                        $kalender->save();
                    }
                }
            }

            // Update the keterangan field for all
            Kalender::whereIn('id', $request->ids)->update(['keterangan' => $request->keterangan]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => count($request->ids) . ' data berhasil diubah keterangannya menjadi ' . $request->keterangan
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan: ' . $e->getMessage()
            ], 500);
        }
    }
}
