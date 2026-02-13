<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AttendanceToken;
use App\Models\AbsensiMengajar;
use App\Models\AbsensiKegiatan;
use App\Models\AbsensiRapat;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;

class AttendanceTokenController extends Controller
{
    /**
     * Show the attendance form for a token
     */
    public function show(string $token)
    {
        $attendanceToken = AttendanceToken::with('guru')->where('token', $token)->first();

        if (!$attendanceToken) {
            return response()->view('attendance_token.invalid', [
                'message' => 'Link absensi tidak valid atau tidak ditemukan.'
            ], 404);
        }

        if (!$attendanceToken->isValid()) {
            $reason = $attendanceToken->used_at
                ? 'Anda sudah melakukan absensi melalui link ini.'
                : 'Link absensi sudah kadaluarsa (berlaku sampai jam 23:59).';

            return response()->view('attendance_token.invalid', [
                'message' => $reason
            ]);
        }

        $reference = $attendanceToken->getReference();

        return view('attendance_token.form', [
            'token' => $attendanceToken,
            'reference' => $reference,
        ]);
    }

    /**
     * Submit attendance via token
     */
    public function submit(Request $request, string $token)
    {
        $attendanceToken = AttendanceToken::with('guru')->where('token', $token)->first();

        if (!$attendanceToken || !$attendanceToken->isValid()) {
            return response()->view('attendance_token.invalid', [
                'message' => 'Link absensi tidak valid, sudah digunakan, atau sudah kadaluarsa.'
            ], 400);
        }

        try {
            $now = Carbon::now();

            switch ($attendanceToken->type) {
                case 'mengajar':
                    $this->submitMengajar($attendanceToken, $request, $now);
                    break;
                case 'kegiatan':
                    $this->submitKegiatan($attendanceToken, $request, $now);
                    break;
                case 'rapat':
                    $this->submitRapat($attendanceToken, $request, $now);
                    break;
            }

            $attendanceToken->markUsed();

            Log::channel('whatsapp')->info('Token attendance submitted', [
                'guru' => $attendanceToken->guru->nama,
                'type' => $attendanceToken->type,
                'reference_id' => $attendanceToken->reference_id,
            ]);

            return view('attendance_token.success', [
                'token' => $attendanceToken,
            ]);
        } catch (\Exception $e) {
            Log::channel('whatsapp')->error('Token attendance error', [
                'token' => $token,
                'error' => $e->getMessage(),
            ]);

            return response()->view('attendance_token.invalid', [
                'message' => 'Terjadi kesalahan saat menyimpan absensi: ' . $e->getMessage()
            ], 500);
        }
    }

    protected function submitMengajar(AttendanceToken $token, Request $request, Carbon $now): void
    {
        $existing = AbsensiMengajar::where('jadwal_id', $token->reference_id)
            ->whereDate('tanggal', $token->tanggal)
            ->first();

        if ($existing) {
            // Update existing
            $existing->update([
                'guru_status' => 'H',
                'guru_keterangan' => $request->input('keterangan', 'Hadir (via link WA)'),
                'ringkasan_materi' => $request->input('ringkasan_materi', $existing->ringkasan_materi),
                'absensi_time' => $now,
                'status' => 'hadir',
            ]);
        } else {
            // Create new
            $jadwal = \App\Models\Jadwal::with(['kelas', 'mapel', 'guru'])->find($token->reference_id);

            AbsensiMengajar::create([
                'jadwal_id' => $token->reference_id,
                'guru_id' => $token->guru_id,
                'snapshot_kelas' => $jadwal?->kelas?->nama,
                'snapshot_mapel' => $jadwal?->mapel?->nama,
                'snapshot_jam' => $jadwal?->jam_mulai . '-' . $jadwal?->jam_selesai,
                'snapshot_hari' => $jadwal?->hari,
                'snapshot_guru_nama' => $token->guru->nama,
                'tanggal' => $token->tanggal,
                'ringkasan_materi' => $request->input('ringkasan_materi'),
                'status' => 'hadir',
                'guru_status' => 'H',
                'guru_keterangan' => $request->input('keterangan', 'Hadir (via link WA)'),
                'absensi_time' => $now,
            ]);
        }
    }

    protected function submitKegiatan(AttendanceToken $token, Request $request, Carbon $now): void
    {
        $kegiatan = \App\Models\Kegiatan::find($token->reference_id);
        if (!$kegiatan)
            return;

        $existing = AbsensiKegiatan::where('kegiatan_id', $token->reference_id)
            ->whereDate('tanggal', $token->tanggal)
            ->first();

        if ($existing) {
            // Update guru's attendance in the array
            $pendamping = $existing->absensi_pendamping ?? [];
            $updated = false;

            // Check if this guru is PJ
            if ($existing->penanggung_jawab_id == $token->guru_id) {
                $existing->update([
                    'pj_status' => 'H',
                    'pj_keterangan' => $request->input('keterangan', 'Hadir (via link WA)'),
                ]);
                $updated = true;
            }

            // Update in pendamping array
            foreach ($pendamping as &$p) {
                if (($p['guru_id'] ?? 0) == $token->guru_id) {
                    $p['status'] = 'H';
                    $p['keterangan'] = $request->input('keterangan', 'Hadir (via link WA)');
                    $updated = true;
                }
            }

            if ($updated) {
                $existing->update(['absensi_pendamping' => $pendamping]);
            }
        }
        // If no absensi record exists yet, the PJ/admin will create it
    }

    protected function submitRapat(AttendanceToken $token, Request $request, Carbon $now): void
    {
        $rapat = \App\Models\Rapat::find($token->reference_id);
        if (!$rapat)
            return;

        $existing = AbsensiRapat::where('rapat_id', $token->reference_id)
            ->whereDate('tanggal', $token->tanggal)
            ->first();

        if ($existing) {
            // Check if guru is pimpinan
            if ($rapat->pimpinan_id == $token->guru_id) {
                $existing->update([
                    'pimpinan_status' => 'H',
                    'pimpinan_keterangan' => $request->input('keterangan', 'Hadir (via link WA)'),
                    'pimpinan_self_attended' => true,
                    'pimpinan_attended_at' => $now,
                ]);
            }

            // Update in peserta array
            $peserta = $existing->absensi_peserta ?? [];
            foreach ($peserta as &$p) {
                if (($p['guru_id'] ?? 0) == $token->guru_id) {
                    $p['status'] = 'H';
                    $p['keterangan'] = $request->input('keterangan', 'Hadir (via link WA)');
                    $p['self_attended'] = true;
                    $p['attended_at'] = $now->toDateTimeString();
                }
            }
            $existing->update(['absensi_peserta' => $peserta]);
        }
    }
}
