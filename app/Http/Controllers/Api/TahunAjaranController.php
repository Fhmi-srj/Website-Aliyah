<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TahunAjaran;
use Illuminate\Http\Request;

class TahunAjaranController extends Controller
{
    /**
     * Get all tahun ajaran.
     */
    public function index()
    {
        // Auto-generate if needed
        TahunAjaran::autoGenerate();

        $tahunAjaran = TahunAjaran::orderBy('tanggal_mulai', 'desc')->get();

        return response()->json([
            'success' => true,
            'data' => $tahunAjaran
        ]);
    }

    /**
     * Get the active tahun ajaran for the current user.
     */
    public function getActive(Request $request)
    {
        // Auto-generate if needed
        TahunAjaran::autoGenerate();

        // First check if user has a preference stored
        $user = $request->user();
        $userTahunAjaranId = $user->tahun_ajaran_id ?? null;

        if ($userTahunAjaranId) {
            $tahunAjaran = TahunAjaran::find($userTahunAjaranId);
            if ($tahunAjaran) {
                return response()->json([
                    'success' => true,
                    'data' => $tahunAjaran
                ]);
            }
        }

        // Fallback to current period based on date
        $tahunAjaran = TahunAjaran::getCurrent() ?? TahunAjaran::getActive();

        return response()->json([
            'success' => true,
            'data' => $tahunAjaran
        ]);
    }

    /**
     * Set the active tahun ajaran for the current user.
     */
    public function setActive(Request $request)
    {
        $request->validate([
            'tahun_ajaran_id' => 'required|exists:tahun_ajaran,id'
        ]);

        $user = $request->user();
        $user->tahun_ajaran_id = $request->tahun_ajaran_id;
        $user->save();

        $tahunAjaran = TahunAjaran::find($request->tahun_ajaran_id);

        return response()->json([
            'success' => true,
            'message' => 'Tahun ajaran berhasil diubah',
            'data' => $tahunAjaran
        ]);
    }

    /**
     * Delete a tahun ajaran (admin only).
     */
    public function destroy($id)
    {
        $tahunAjaran = TahunAjaran::findOrFail($id);

        // Don't allow deleting the current active period
        $current = TahunAjaran::getCurrent();
        if ($current && $current->id === $tahunAjaran->id) {
            return response()->json([
                'success' => false,
                'message' => 'Tidak dapat menghapus tahun ajaran yang sedang berjalan'
            ], 422);
        }

        $tahunAjaran->delete();

        return response()->json([
            'success' => true,
            'message' => 'Tahun ajaran berhasil dihapus'
        ]);
    }
}
