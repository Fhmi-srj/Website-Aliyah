<?php

namespace App\Http\Controllers\Api\Guru;

use App\Http\Controllers\Controller;
use App\Models\Supervisi;
use App\Models\TahunAjaran;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class GuruSupervisiController extends Controller
{
    /**
     * Get supervisi data for the logged-in guru
     * Returns both scheduled (jadwal) and completed (hasil) supervisions
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $guru = $user->guru;

        if (!$guru) {
            return response()->json([
                'success' => true,
                'jadwal' => [],
                'hasil' => [],
            ]);
        }

        // Get active tahun ajaran
        $tahunAjaran = TahunAjaran::where('is_active', true)->first();
        $tahunAjaranId = $tahunAjaran?->id;

        $query = Supervisi::where('guru_id', $guru->id)
            ->with([
                'supervisor:id,nama,nip,jabatan',
                'mapel:id,nama_mapel',
                'tahunAjaran:id,nama',
            ]);

        if ($tahunAjaranId) {
            $query->where('tahun_ajaran_id', $tahunAjaranId);
        }

        $all = $query->orderBy('tanggal', 'desc')->get();

        // Split into jadwal (pending) and hasil (completed)
        $jadwal = $all->where('status', '!=', 'selesai')->values();
        $hasil = $all->where('status', 'selesai')->values();

        return response()->json([
            'success' => true,
            'jadwal' => $jadwal,
            'hasil' => $hasil,
        ]);
    }
}
