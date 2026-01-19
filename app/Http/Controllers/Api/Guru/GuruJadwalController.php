<?php

namespace App\Http\Controllers\Api\Guru;

use App\Http\Controllers\Controller;
use App\Models\Kegiatan;
use App\Models\Rapat;
use App\Models\Guru;
use Illuminate\Http\Request;
use Carbon\Carbon;

class GuruJadwalController extends Controller
{
    /**
     * Get kegiatan schedule for next 7 days
     */
    public function getJadwalKegiatan(Request $request)
    {
        $user = auth()->user();
        $guru = $user->guru;

        if (!$guru) {
            return response()->json(['data' => [], 'message' => 'Guru not found'], 200);
        }

        $today = Carbon::today();
        $nextWeek = Carbon::today()->addDays(7);
        $search = $request->get('search', '');

        // Get kegiatan where guru is PJ or in pendamping array
        // Include: ongoing (started but not ended) OR upcoming (starts within 7 days)
        $guruId = (int) $guru->id;
        
        $kegiatanQuery = Kegiatan::where(function ($query) use ($guruId) {
            $query->where('penanggung_jawab_id', $guruId)
                ->orWhereJsonContains('guru_pendamping', $guruId)
                ->orWhereJsonContains('guru_pendamping', (string) $guruId);
        })
            ->where('status', 'Aktif')
            ->where(function ($query) use ($today, $nextWeek) {
                // Ongoing: belum berakhir (waktu_berakhir >= today)
                // AND (sudah dimulai OR akan dimulai dalam 7 hari)
                $query->whereDate('waktu_berakhir', '>=', $today)
                    ->whereDate('waktu_mulai', '<=', $nextWeek);
            })
            ->orderBy('waktu_mulai');

        if ($search) {
            $kegiatanQuery->where(function ($q) use ($search) {
                $q->where('nama_kegiatan', 'like', "%{$search}%")
                    ->orWhere('tempat', 'like', "%{$search}%");
            });
        }

        $kegiatanList = $kegiatanQuery->with('penanggungjawab')->get();

        $data = $kegiatanList->map(function ($kegiatan) use ($guruId) {
            $isPJ = (int) $kegiatan->penanggung_jawab_id === $guruId;
            $status = $this->getKegiatanStatus($kegiatan, null);

            $waktuMulai = Carbon::parse($kegiatan->waktu_mulai);
            $waktuSelesai = Carbon::parse($kegiatan->waktu_berakhir);

            return [
                'id' => $kegiatan->id,
                'name' => $kegiatan->nama_kegiatan,
                'location' => $kegiatan->tempat,
                'date' => $waktuMulai->format('Y-m-d'),
                'tanggal' => $waktuMulai->format('Y-m-d'),
                'time' => $waktuMulai->format('H:i') . ' - ' . $waktuSelesai->format('H:i'),
                'status' => $status,
                'isPJ' => $isPJ,
                'pj' => $kegiatan->penanggungjawab?->nama ?? '-',
            ];
        });

        return response()->json(['data' => $data]);
    }

    /**
     * Get rapat schedule for next 7 days
     */
    public function getJadwalRapat(Request $request)
    {
        $user = auth()->user();
        $guru = $user->guru;

        if (!$guru) {
            return response()->json(['data' => [], 'message' => 'Guru not found'], 200);
        }

        $today = Carbon::today();
        $nextWeek = Carbon::today()->addDays(7);
        $search = $request->get('search', '');

        // Get rapat where guru is in peserta_rapat array, pimpinan, or sekretaris
        // Include: rapat yang dijadwalkan dan tanggal >= hari ini
        $guruId = (int) $guru->id;
        
        $rapatQuery = Rapat::where(function ($query) use ($guruId) {
            $query->where('pimpinan_id', $guruId)
                ->orWhere('sekretaris_id', $guruId)
                ->orWhereJsonContains('peserta_rapat', $guruId)
                ->orWhereJsonContains('peserta_rapat', (string) $guruId);
        })
            ->where('status', 'Dijadwalkan')
            ->whereDate('tanggal', '>=', $today)
            ->whereDate('tanggal', '<=', $nextWeek)
            ->orderBy('tanggal')
            ->orderBy('waktu_mulai');

        if ($search) {
            $rapatQuery->where(function ($q) use ($search) {
                $q->where('agenda_rapat', 'like', "%{$search}%")
                    ->orWhere('tempat', 'like', "%{$search}%");
            });
        }

        $rapatList = $rapatQuery->get();

        $data = $rapatList->map(function ($rapat) use ($guruId) {
            $role = 'peserta';
            if ((int) $rapat->pimpinan_id === $guruId) {
                $role = 'pimpinan';
            } elseif ((int) $rapat->sekretaris_id === $guruId) {
                $role = 'sekretaris';
            }

            $status = $this->getRapatStatus($rapat, null);

            return [
                'id' => $rapat->id,
                'name' => $rapat->agenda_rapat,
                'location' => $rapat->tempat,
                'date' => $rapat->tanggal->format('Y-m-d'),
                'tanggal' => $rapat->tanggal->format('Y-m-d'),
                'time' => Carbon::parse($rapat->waktu_mulai)->format('H:i') . ' - ' . Carbon::parse($rapat->waktu_selesai)->format('H:i'),
                'status' => $status,
                'role' => $role,
            ];
        });

        return response()->json(['data' => $data]);
    }

    /**
     * Determine kegiatan status
     */
    private function getKegiatanStatus($kegiatan, $guru)
    {
        $now = Carbon::now();
        $kegiatanStart = Carbon::parse($kegiatan->waktu_mulai);
        $kegiatanEnd = Carbon::parse($kegiatan->waktu_berakhir);

        // Check time-based status first
        if ($now->lt($kegiatanStart)) {
            return 'belum_mulai';
        } elseif ($now->between($kegiatanStart, $kegiatanEnd)) {
            return 'sedang_berlangsung';
        } else {
            return 'terlewat';
        }
    }

    /**
     * Determine rapat status
     */
    private function getRapatStatus($rapat, $guru)
    {
        $now = Carbon::now();
        $rapatDate = $rapat->tanggal->format('Y-m-d');
        $rapatStart = Carbon::parse($rapatDate . ' ' . $rapat->waktu_mulai);
        $rapatEnd = Carbon::parse($rapatDate . ' ' . $rapat->waktu_selesai);

        // Check time-based status
        if ($now->lt($rapatStart)) {
            return 'belum_mulai';
        } elseif ($now->between($rapatStart, $rapatEnd)) {
            return 'sedang_berlangsung';
        } else {
            return 'terlewat';
        }
    }
}
