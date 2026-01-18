<?php

namespace App\Http\Controllers\Api\Guru;

use App\Http\Controllers\Controller;
use App\Models\Rapat;
use App\Models\AbsensiRapat;
use App\Models\Guru;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Carbon;

class GuruRapatController extends Controller
{
    /**
     * Get rapat hari ini untuk guru yang login dengan status absensi
     */
    public function rapatHariIni(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $guru = Guru::find($user->guru_id);

            if (!$guru) {
                return response()->json(['error' => 'Guru tidak ditemukan'], 404);
            }

            $today = Carbon::today('Asia/Jakarta');
            $tanggal = Carbon::now()->locale('id')->translatedFormat('l, d F Y');

            // Get rapat where guru is pimpinan, sekretaris, or peserta AND rapat is today
            $rapatList = Rapat::where('status', 'Dijadwalkan')
                ->whereDate('tanggal', $today)
                ->where(function ($query) use ($guru) {
                    $query->where('pimpinan_id', $guru->id)
                        ->orWhere('sekretaris_id', $guru->id)
                        ->orWhereJsonContains('peserta_rapat', $guru->id)
                        ->orWhereJsonContains('peserta_rapat', (string) $guru->id);
                })
                ->with(['pimpinanGuru:id,nama,nip', 'sekretarisGuru:id,nama,nip'])
                ->orderBy('waktu_mulai', 'asc')
                ->get()
                ->map(function ($item) use ($guru, $today) {
                    // Determine role
                    $isPimpinan = $item->pimpinan_id === $guru->id;
                    $isSekretaris = $item->sekretaris_id === $guru->id;
                    $pesertaRapat = is_array($item->peserta_rapat) ? $item->peserta_rapat : [];
                    $isPeserta = in_array($guru->id, $pesertaRapat) || in_array((string) $guru->id, $pesertaRapat);

                    $role = 'peserta';
                    if ($isPimpinan)
                        $role = 'pimpinan';
                    elseif ($isSekretaris)
                        $role = 'sekretaris';

                    $item->is_pimpinan = $isPimpinan;
                    $item->is_sekretaris = $isSekretaris;
                    $item->is_peserta = $isPeserta;
                    $item->role = $role;

                    // Check absensi status
                    $absensi = AbsensiRapat::where('rapat_id', $item->id)->first();

                    // Determine status based on role and absensi record
                    if ($absensi) {
                        if ($isSekretaris) {
                            // For Sekretaris: only 'submitted' counts as sudah_absen
                            if ($absensi->status === 'submitted') {
                                $item->status_absensi = 'sudah_absen';
                            } else {
                                // Draft exists, sekretaris should still fill
                                $now = Carbon::now('Asia/Jakarta');
                                $mulai = Carbon::parse($today->toDateString() . ' ' . $item->waktu_mulai);
                                $selesai = Carbon::parse($today->toDateString() . ' ' . $item->waktu_selesai);

                                if ($now->lt($mulai)) {
                                    $item->status_absensi = 'belum_mulai';
                                } elseif ($now->between($mulai, $selesai)) {
                                    $item->status_absensi = 'sedang_berlangsung';
                                } else {
                                    $item->status_absensi = 'terlewat';
                                }
                            }
                        } elseif ($isPimpinan) {
                            // For Pimpinan: check if self-attended
                            if ($absensi->pimpinan_self_attended) {
                                $item->status_absensi = 'sudah_absen';
                            } else {
                                $now = Carbon::now('Asia/Jakarta');
                                $mulai = Carbon::parse($today->toDateString() . ' ' . $item->waktu_mulai);
                                $selesai = Carbon::parse($today->toDateString() . ' ' . $item->waktu_selesai);

                                if ($now->lt($mulai)) {
                                    $item->status_absensi = 'belum_mulai';
                                } elseif ($now->between($mulai, $selesai)) {
                                    $item->status_absensi = 'sedang_berlangsung';
                                } else {
                                    $item->status_absensi = 'terlewat';
                                }
                            }
                        } else {
                            // For Peserta: check if self-attended
                            $pesertaAbsensi = $absensi->absensi_peserta ?? [];
                            $selfAttended = false;
                            foreach ($pesertaAbsensi as $entry) {
                                if ($entry['guru_id'] == $guru->id && !empty($entry['self_attended'])) {
                                    $selfAttended = true;
                                    break;
                                }
                            }

                            if ($selfAttended) {
                                $item->status_absensi = 'sudah_absen';
                            } else {
                                $now = Carbon::now('Asia/Jakarta');
                                $mulai = Carbon::parse($today->toDateString() . ' ' . $item->waktu_mulai);
                                $selesai = Carbon::parse($today->toDateString() . ' ' . $item->waktu_selesai);

                                if ($now->lt($mulai)) {
                                    $item->status_absensi = 'belum_mulai';
                                } elseif ($now->between($mulai, $selesai)) {
                                    $item->status_absensi = 'sedang_berlangsung';
                                } else {
                                    $item->status_absensi = 'terlewat';
                                }
                            }
                        }
                    } else {
                        // No absensi record exists yet
                        $now = Carbon::now('Asia/Jakarta');
                        $mulai = Carbon::parse($today->toDateString() . ' ' . $item->waktu_mulai);
                        $selesai = Carbon::parse($today->toDateString() . ' ' . $item->waktu_selesai);

                        if ($now->lt($mulai)) {
                            $item->status_absensi = 'belum_mulai';
                        } elseif ($now->between($mulai, $selesai)) {
                            $item->status_absensi = 'sedang_berlangsung';
                        } else {
                            $item->status_absensi = 'terlewat';
                        }
                    }

                    // Get peserta names
                    if (!empty($pesertaRapat)) {
                        $item->peserta_list = Guru::whereIn('id', $pesertaRapat)
                            ->select('id', 'nama', 'nip')
                            ->get();
                    } else {
                        $item->peserta_list = [];
                    }

                    return $item;
                });

            return response()->json([
                'rapat' => $rapatList,
                'tanggal' => $tanggal,
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Get detail rapat dengan list peserta untuk form absensi
     */
    public function detailRapat(Request $request, $id): JsonResponse
    {
        $user = $request->user();
        $guru = Guru::find($user->guru_id);

        if (!$guru) {
            return response()->json(['error' => 'Guru tidak ditemukan'], 404);
        }

        $rapat = Rapat::with(['pimpinanGuru:id,nama,nip', 'sekretarisGuru:id,nama,nip'])
            ->find($id);

        if (!$rapat) {
            return response()->json(['error' => 'Rapat tidak ditemukan'], 404);
        }

        // Get peserta list
        $pesertaRapat = is_array($rapat->peserta_rapat) ? $rapat->peserta_rapat : [];
        $pesertaList = [];
        if (!empty($pesertaRapat)) {
            $pesertaList = Guru::whereIn('id', $pesertaRapat)
                ->select('id', 'nama', 'nip')
                ->get();
        }

        // Get existing absensi if any
        $absensi = AbsensiRapat::where('rapat_id', $rapat->id)->first();

        return response()->json([
            'rapat' => $rapat,
            'pimpinan' => $rapat->pimpinanGuru,
            'sekretaris' => $rapat->sekretarisGuru,
            'peserta' => $pesertaList,
            'absensi' => $absensi,
        ]);
    }

    /**
     * Pimpinan self-attend
     */
    public function absensiPimpinan(Request $request): JsonResponse
    {
        $user = $request->user();
        $guru = Guru::find($user->guru_id);

        if (!$guru) {
            return response()->json(['error' => 'Guru tidak ditemukan'], 404);
        }

        $validated = $request->validate([
            'rapat_id' => 'required|exists:rapat,id',
            'status' => 'required|in:H,I,A',
            'keterangan' => 'nullable|string',
        ]);

        $rapat = Rapat::find($validated['rapat_id']);

        // Verify guru is the pimpinan
        if ($rapat->pimpinan_id !== $guru->id) {
            return response()->json(['error' => 'Anda bukan pimpinan rapat ini'], 403);
        }

        $today = Carbon::today('Asia/Jakarta');

        // Find or create absensi record
        $absensi = AbsensiRapat::where('rapat_id', $rapat->id)->first();

        if ($absensi) {
            // Update existing record
            $absensi->update([
                'pimpinan_status' => $validated['status'],
                'pimpinan_keterangan' => $validated['keterangan'] ?? null,
                'pimpinan_self_attended' => true,
                'pimpinan_attended_at' => now(),
            ]);
        } else {
            // Create new record
            $absensi = AbsensiRapat::create([
                'rapat_id' => $rapat->id,
                'tanggal' => $today,
                'pimpinan_status' => $validated['status'],
                'pimpinan_keterangan' => $validated['keterangan'] ?? null,
                'pimpinan_self_attended' => true,
                'pimpinan_attended_at' => now(),
                'status' => 'draft',
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Absensi pimpinan berhasil disimpan',
            'data' => [
                'status' => $validated['status'],
                'keterangan' => $validated['keterangan'] ?? null,
            ]
        ]);
    }

    /**
     * Peserta self-attend
     */
    public function absensiPeserta(Request $request): JsonResponse
    {
        $user = $request->user();
        $guru = Guru::find($user->guru_id);

        if (!$guru) {
            return response()->json(['error' => 'Guru tidak ditemukan'], 404);
        }

        $validated = $request->validate([
            'rapat_id' => 'required|exists:rapat,id',
            'status' => 'required|in:H,I,A',
            'keterangan' => 'nullable|string',
        ]);

        $rapat = Rapat::find($validated['rapat_id']);

        // Verify guru is a peserta
        $pesertaRapat = is_array($rapat->peserta_rapat) ? $rapat->peserta_rapat : [];
        $isPeserta = in_array($guru->id, $pesertaRapat) || in_array((string) $guru->id, $pesertaRapat);

        if (!$isPeserta) {
            return response()->json(['error' => 'Anda bukan peserta rapat ini'], 403);
        }

        $today = Carbon::today('Asia/Jakarta');

        // Find or create absensi record
        $absensi = AbsensiRapat::where('rapat_id', $rapat->id)->first();

        if ($absensi) {
            // Update existing record - add or update this peserta's attendance
            $currentAbsensi = $absensi->absensi_peserta ?? [];

            // Find and update or add new entry
            $found = false;
            foreach ($currentAbsensi as &$entry) {
                if ($entry['guru_id'] == $guru->id) {
                    $entry['status'] = $validated['status'];
                    $entry['keterangan'] = $validated['keterangan'] ?? null;
                    $entry['self_attended'] = true;
                    $entry['attended_at'] = now()->toISOString();
                    $found = true;
                    break;
                }
            }

            if (!$found) {
                $currentAbsensi[] = [
                    'guru_id' => $guru->id,
                    'status' => $validated['status'],
                    'keterangan' => $validated['keterangan'] ?? null,
                    'self_attended' => true,
                    'attended_at' => now()->toISOString(),
                ];
            }

            $absensi->update([
                'absensi_peserta' => $currentAbsensi,
            ]);
        } else {
            // Create new record with this peserta's attendance
            $absensi = AbsensiRapat::create([
                'rapat_id' => $rapat->id,
                'tanggal' => $today,
                'absensi_peserta' => [
                    [
                        'guru_id' => $guru->id,
                        'status' => $validated['status'],
                        'keterangan' => $validated['keterangan'] ?? null,
                        'self_attended' => true,
                        'attended_at' => now()->toISOString(),
                    ]
                ],
                'status' => 'draft',
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Absensi Anda berhasil disimpan',
            'data' => [
                'status' => $validated['status'],
                'keterangan' => $validated['keterangan'] ?? null,
            ]
        ]);
    }

    /**
     * Sekretaris submit full attendance + notulensi + photos
     */
    public function absensiSekretaris(Request $request): JsonResponse
    {
        $user = $request->user();
        $guru = Guru::find($user->guru_id);

        if (!$guru) {
            return response()->json(['error' => 'Guru tidak ditemukan'], 404);
        }

        $validated = $request->validate([
            'rapat_id' => 'required|exists:rapat,id',
            'pimpinan_status' => 'required|in:H,I,A',
            'pimpinan_keterangan' => 'nullable|string',
            'sekretaris_status' => 'required|in:H,I,A',
            'sekretaris_keterangan' => 'nullable|string',
            'absensi_peserta' => 'required|array',
            'absensi_peserta.*.guru_id' => 'required|integer',
            'absensi_peserta.*.status' => 'required|in:H,I,A',
            'absensi_peserta.*.keterangan' => 'nullable|string',
            'notulensi' => 'required|string',
            'foto_rapat' => 'required|array|min:2|max:4',
            'foto_rapat.*' => 'required|string', // Base64 images
        ]);

        $rapat = Rapat::find($validated['rapat_id']);

        // Verify guru is the sekretaris
        if ($rapat->sekretaris_id !== $guru->id) {
            return response()->json(['error' => 'Hanya sekretaris yang bisa menyimpan absensi'], 403);
        }

        $today = Carbon::today('Asia/Jakarta');

        // Check if already submitted
        $existing = AbsensiRapat::where('rapat_id', $rapat->id)->first();

        if ($existing && $existing->status === 'submitted') {
            return response()->json(['error' => 'Absensi rapat ini sudah dilakukan'], 422);
        }

        // Merge peserta absensi - preserve self-attended data
        $mergedPeserta = [];
        $existingPeserta = $existing ? ($existing->absensi_peserta ?? []) : [];
        $newPeserta = $validated['absensi_peserta'] ?? [];

        foreach ($newPeserta as $newEntry) {
            $found = false;
            foreach ($existingPeserta as $existingEntry) {
                if ($existingEntry['guru_id'] == $newEntry['guru_id']) {
                    // If existing was self-attended, keep self_attended flag
                    $mergedEntry = $newEntry;
                    if (!empty($existingEntry['self_attended'])) {
                        $mergedEntry['self_attended'] = true;
                        $mergedEntry['attended_at'] = $existingEntry['attended_at'] ?? null;
                    }
                    $mergedPeserta[] = $mergedEntry;
                    $found = true;
                    break;
                }
            }
            if (!$found) {
                $mergedPeserta[] = $newEntry;
            }
        }

        // Preserve pimpinan self-attended status if exists
        $pimpinanSelfAttended = $existing ? $existing->pimpinan_self_attended : false;
        $pimpinanAttendedAt = $existing ? $existing->pimpinan_attended_at : null;

        if ($existing) {
            $existing->update([
                'pimpinan_status' => $validated['pimpinan_status'],
                'pimpinan_keterangan' => $validated['pimpinan_keterangan'] ?? null,
                'pimpinan_self_attended' => $pimpinanSelfAttended,
                'pimpinan_attended_at' => $pimpinanAttendedAt,
                'sekretaris_status' => $validated['sekretaris_status'],
                'sekretaris_keterangan' => $validated['sekretaris_keterangan'] ?? null,
                'absensi_peserta' => $mergedPeserta,
                'notulensi' => $validated['notulensi'],
                'foto_rapat' => $validated['foto_rapat'],
                'status' => 'submitted',
            ]);
        } else {
            AbsensiRapat::create([
                'rapat_id' => $rapat->id,
                'tanggal' => $today,
                'pimpinan_status' => $validated['pimpinan_status'],
                'pimpinan_keterangan' => $validated['pimpinan_keterangan'] ?? null,
                'sekretaris_status' => $validated['sekretaris_status'],
                'sekretaris_keterangan' => $validated['sekretaris_keterangan'] ?? null,
                'absensi_peserta' => $mergedPeserta,
                'notulensi' => $validated['notulensi'],
                'foto_rapat' => $validated['foto_rapat'],
                'status' => 'submitted',
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Absensi rapat berhasil disimpan',
        ], 201);
    }

    /**
     * Get current absensi status for realtime sync
     */
    public function getAbsensiPeserta(Request $request, $id): JsonResponse
    {
        $absensi = AbsensiRapat::where('rapat_id', $id)->first();

        if (!$absensi) {
            return response()->json([
                'success' => true,
                'pimpinan' => null,
                'peserta' => []
            ]);
        }

        return response()->json([
            'success' => true,
            'pimpinan' => [
                'status' => $absensi->pimpinan_status,
                'keterangan' => $absensi->pimpinan_keterangan,
                'self_attended' => $absensi->pimpinan_self_attended,
            ],
            'peserta' => $absensi->absensi_peserta ?? []
        ]);
    }

    /**
     * Check if user already self-attended
     */
    public function checkPesertaStatus(Request $request, $id): JsonResponse
    {
        $user = $request->user();
        $guru = Guru::find($user->guru_id);

        if (!$guru) {
            return response()->json(['error' => 'Guru tidak ditemukan'], 404);
        }

        $rapat = Rapat::find($id);
        if (!$rapat) {
            return response()->json(['error' => 'Rapat tidak ditemukan'], 404);
        }

        $absensi = AbsensiRapat::where('rapat_id', $id)->first();

        if (!$absensi) {
            return response()->json([
                'success' => true,
                'attended' => false,
                'status' => null,
                'role' => $this->getUserRole($rapat, $guru)
            ]);
        }

        // Check based on role
        $isPimpinan = $rapat->pimpinan_id === $guru->id;
        $isSekretaris = $rapat->sekretaris_id === $guru->id;

        if ($isPimpinan && $absensi->pimpinan_self_attended) {
            return response()->json([
                'success' => true,
                'attended' => true,
                'status' => $absensi->pimpinan_status,
                'keterangan' => $absensi->pimpinan_keterangan,
                'role' => 'pimpinan'
            ]);
        }

        if ($isSekretaris && $absensi->status === 'submitted') {
            return response()->json([
                'success' => true,
                'attended' => true,
                'status' => $absensi->sekretaris_status,
                'keterangan' => $absensi->sekretaris_keterangan,
                'role' => 'sekretaris'
            ]);
        }

        // Check peserta
        $pesertaAbsensi = $absensi->absensi_peserta ?? [];
        foreach ($pesertaAbsensi as $entry) {
            if ($entry['guru_id'] == $guru->id && !empty($entry['self_attended'])) {
                return response()->json([
                    'success' => true,
                    'attended' => true,
                    'status' => $entry['status'],
                    'keterangan' => $entry['keterangan'] ?? null,
                    'role' => 'peserta'
                ]);
            }
        }

        return response()->json([
            'success' => true,
            'attended' => false,
            'status' => null,
            'role' => $this->getUserRole($rapat, $guru)
        ]);
    }

    private function getUserRole($rapat, $guru): string
    {
        if ($rapat->pimpinan_id === $guru->id)
            return 'pimpinan';
        if ($rapat->sekretaris_id === $guru->id)
            return 'sekretaris';
        return 'peserta';
    }
}
