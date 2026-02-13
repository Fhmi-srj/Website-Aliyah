<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Kalender;
use App\Models\Kegiatan;
use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class KalenderController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $kalender = Kalender::with('guru:id,nama')
            ->orderBy('tanggal_mulai', 'desc')
            ->get();

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
            $kalenderData = $request->all();
            $kegiatanId = null;

            // If keterangan is "Kegiatan", create linked kegiatan entry
            if ($request->keterangan === 'Kegiatan') {
                // Get guru name if guru_id is provided
                $penanggungJawabNama = '';
                if ($request->guru_id) {
                    $guru = \App\Models\Guru::find($request->guru_id);
                    $penanggungJawabNama = $guru ? $guru->nama : '';
                }

                // Get active tahun ajaran
                $tahunAjaran = \App\Models\TahunAjaran::where('is_active', true)->first();

                $kegiatan = Kegiatan::create([
                    'nama_kegiatan' => $request->kegiatan,
                    'jenis_kegiatan' => 'Rutin',
                    'waktu_mulai' => $request->tanggal_mulai,
                    'waktu_berakhir' => $request->tanggal_berakhir ?? $request->tanggal_mulai,
                    'tempat' => $request->tempat,
                    'penanggung_jawab_id' => $request->guru_id,
                    'penanggung_jawab' => $penanggungJawabNama, // Add the required field
                    'status' => 'Aktif',
                    'status_kbm' => $request->status_kbm,
                    'tahun_ajaran_id' => $tahunAjaran ? $tahunAjaran->id : null,
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
            $kalenderData = $request->all();

            // Capture old values for logging
            $oldValues = $kalender->getOriginal();

            // Handle kegiatan sync
            if ($request->keterangan === 'Kegiatan') {
                // If already linked to kegiatan, update it
                if ($kalender->kegiatan_id) {
                    $kegiatan = Kegiatan::find($kalender->kegiatan_id);
                    if ($kegiatan) {
                        $kegiatan->update([
                            'nama_kegiatan' => $request->kegiatan,
                            'waktu_mulai' => $request->tanggal_mulai,
                            'waktu_berakhir' => $request->tanggal_berakhir ?? $request->tanggal_mulai,
                            'tempat' => $request->tempat,
                            'penanggung_jawab_id' => $request->guru_id,
                            'penanggung_jawab' => $request->guru_id ? (\App\Models\Guru::find($request->guru_id)?->nama ?? '-') : '-',
                        ]);
                    }
                } else {
                    // Create new kegiatan link
                    $kegiatan = Kegiatan::create([
                        'nama_kegiatan' => $request->kegiatan,
                        'jenis_kegiatan' => 'Rutin',
                        'waktu_mulai' => $request->tanggal_mulai,
                        'waktu_berakhir' => $request->tanggal_berakhir ?? $request->tanggal_mulai,
                        'tempat' => $request->tempat,
                        'penanggung_jawab_id' => $request->guru_id,
                        'penanggung_jawab' => $request->guru_id ? (\App\Models\Guru::find($request->guru_id)?->nama ?? '-') : '-',
                        'status' => 'Aktif',
                        'tahun_ajaran_id' => $kalender->tahun_ajaran_id,
                    ]);
                    $kalenderData['kegiatan_id'] = $kegiatan->id;
                }
            } else {
                // If changing away from "Kegiatan", just remove the link - DON'T delete the kegiatan
                // This prevents accidental data loss
                if ($kalender->kegiatan_id) {
                    $kalenderData['kegiatan_id'] = null;
                }
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
            'status_kbm' => 'required|in:Aktif,Tidak Aktif'
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

        try {
            Kalender::whereIn('id', $request->ids)->update(['keterangan' => $request->keterangan]);

            return response()->json([
                'success' => true,
                'message' => count($request->ids) . ' data berhasil diubah keterangannya menjadi ' . $request->keterangan
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan: ' . $e->getMessage()
            ], 500);
        }
    }
}
