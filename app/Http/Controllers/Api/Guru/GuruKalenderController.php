<?php

namespace App\Http\Controllers\Api\Guru;

use App\Http\Controllers\Controller;
use App\Models\Kalender;
use App\Models\Kegiatan;
use App\Models\TahunAjaran;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class GuruKalenderController extends Controller
{
    /**
     * Get all calendar events and activities where guru is PJ
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $guru = $user->guru;

        // Get active tahun ajaran or fallback
        $tahunAjaran = $user->tahun_ajaran_id
            ? TahunAjaran::find($user->tahun_ajaran_id)
            : TahunAjaran::where('is_active', true)->first();

        // 1. Get Kalender Pendidikan
        $kalenderQuery = Kalender::query();
        if ($tahunAjaran) {
            $kalenderQuery->where('tahun_ajaran_id', $tahunAjaran->id);
        }
        $kalenders = $kalenderQuery->orderBy('tanggal_mulai')->get();

        $events = [];

        foreach ($kalenders as $kalender) {
            $events[] = [
                'type' => 'kalender',
                'title' => $kalender->kegiatan ?? 'Agenda Kalender',
                'start' => $kalender->tanggal_mulai,
                'end' => $kalender->tanggal_berakhir,
                'status_kbm' => $kalender->status_kbm,
                'keterangan' => $kalender->keterangan,
                'is_pj' => false
            ];
        }

        // 2. Get Kegiatan
        $kegiatanQuery = Kegiatan::where('status', 'Aktif');
        if ($tahunAjaran) {
            $kegiatanQuery->where('tahun_ajaran_id', $tahunAjaran->id);
        }
        $kegiatans = $kegiatanQuery->with('penanggungJawab')->orderBy('waktu_mulai')->get();

        foreach ($kegiatans as $kegiatan) {
            // Check if user is PJ
            $isPj = false;
            if ($guru && $kegiatan->penanggung_jawab_id == $guru->id) {
                $isPj = true;
            }

            // Get guru pendamping names
            $pendampingNames = [];
            if (!empty($kegiatan->guru_pendamping)) {
                $pendampingNames = \App\Models\Guru::whereIn('id', $kegiatan->guru_pendamping)
                    ->pluck('nama')->toArray();
            }

            $events[] = [
                'type' => 'kegiatan',
                'title' => $kegiatan->nama_kegiatan ?? $kegiatan->nama ?? 'Kegiatan',
                'start' => substr($kegiatan->waktu_mulai, 0, 10),
                'end' => substr($kegiatan->waktu_berakhir, 0, 10),
                'time_start' => substr($kegiatan->waktu_mulai, 11, 5),
                'time_end' => substr($kegiatan->waktu_berakhir, 11, 5),
                'tempat' => $kegiatan->tempat,
                'pj' => $kegiatan->penanggungJawab->nama ?? null,
                'pendamping' => $pendampingNames,
                'peserta' => $kegiatan->peserta,
                'deskripsi' => $kegiatan->deskripsi,
                'is_pj' => $isPj
            ];
        }


        // Sort events by start date
        usort($events, function ($a, $b) {
            return strcmp($a['start'], $b['start']);
        });

        return response()->json([
            'events' => $events,
            'tahun_ajaran' => $tahunAjaran ? $tahunAjaran->nama : 'Semua',
        ]);
    }
}
