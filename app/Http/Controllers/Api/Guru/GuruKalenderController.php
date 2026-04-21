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

        $today = Carbon::today()->toDateString();
        $events = [];

        // 1. Kalender Pendidikan — skip entries that have a linked Kegiatan
        //    (those will appear via the Kegiatan loop below, preventing duplicates)
        $kalenderQuery = Kalender::whereNull('kegiatan_id');
        if ($tahunAjaran) {
            $kalenderQuery->where('tahun_ajaran_id', $tahunAjaran->id);
        }
        $kalenders = $kalenderQuery->orderBy('tanggal_mulai')->get();

        foreach ($kalenders as $kalender) {
            $events[] = [
                'type' => 'kalender',
                'title' => $kalender->kegiatan ?? 'Agenda Kalender',
                'start' => substr($kalender->tanggal_mulai, 0, 10),
                'end' => substr($kalender->tanggal_berakhir, 0, 10),
                'status_kbm' => $kalender->status_kbm,
                'keterangan' => $kalender->keterangan,
                'is_pj' => false,
            ];
        }

        // 2. Kegiatan
        $kegiatanQuery = Kegiatan::where('status', 'Aktif')
            ->with('penanggungJawab');
        if ($tahunAjaran) {
            $kegiatanQuery->where('tahun_ajaran_id', $tahunAjaran->id);
        }
        $kegiatans = $kegiatanQuery->orderBy('waktu_mulai')->get();

        // For recurring kegiatan (kegiatan_rutin_id not null): keep only the next
        // upcoming instance per routine. If all are past, keep the most recent one.
        $seenRoutine = []; // kegiatan_rutin_id => chosen kegiatan

        foreach ($kegiatans as $kegiatan) {
            $routineId = $kegiatan->kegiatan_rutin_id;

            if ($routineId) {
                $startDate = substr($kegiatan->waktu_mulai, 0, 10);
                $isUpcoming = $startDate >= $today;

                if (!isset($seenRoutine[$routineId])) {
                    // First time seeing this routine — store it
                    $seenRoutine[$routineId] = ['kegiatan' => $kegiatan, 'upcoming' => $isUpcoming];
                } else {
                    $stored = $seenRoutine[$routineId];
                    // Prefer upcoming over past
                    if (!$stored['upcoming'] && $isUpcoming) {
                        $seenRoutine[$routineId] = ['kegiatan' => $kegiatan, 'upcoming' => true];
                    } elseif ($stored['upcoming'] && $isUpcoming) {
                        // Both upcoming: keep the closer one (earlier date)
                        $storedDate = substr($stored['kegiatan']->waktu_mulai, 0, 10);
                        if ($startDate < $storedDate) {
                            $seenRoutine[$routineId] = ['kegiatan' => $kegiatan, 'upcoming' => true];
                        }
                    }
                    // If stored is upcoming and this is past → keep stored (do nothing)
                }
                continue; // Will be added after deduplication
            }

            // Non-recurring kegiatan — add directly
            $this->appendKegiatan($events, $kegiatan, $guru);
        }

        // Add deduplicated recurring kegiatan
        foreach ($seenRoutine as $item) {
            $this->appendKegiatan($events, $item['kegiatan'], $guru);
        }

        // Sort by start date
        usort($events, fn($a, $b) => strcmp($a['start'], $b['start']));

        return response()->json([
            'events' => $events,
            'tahun_ajaran' => $tahunAjaran ? $tahunAjaran->nama : 'Semua',
        ]);
    }

    private function appendKegiatan(array &$events, $kegiatan, $guru): void
    {
        $isPj = $guru && $kegiatan->penanggung_jawab_id == $guru->id;

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
            'is_pj' => $isPj,
        ];
    }
}
