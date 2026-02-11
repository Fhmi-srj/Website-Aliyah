<?php

namespace App\Http\Controllers\Api\Guru;

use App\Http\Controllers\Controller;
use App\Models\Rapat;
use App\Models\AbsensiRapat;
use App\Models\Guru;
use App\Models\TahunAjaran;
use App\Models\AppSetting;
use App\Models\ActivityLog;
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

            // Get tahun ajaran from user or active
            $tahunAjaranId = $user->tahun_ajaran_id ?? TahunAjaran::getCurrent()?->id;

            // Get rapat where guru is pimpinan, sekretaris, or peserta AND rapat is today
            $rapatList = Rapat::where('status', 'Dijadwalkan')
                ->when($tahunAjaranId, fn($q) => $q->where('tahun_ajaran_id', $tahunAjaranId))
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
     * Get rapat from today onwards (unlimited).
     * Past rapat are excluded - they will be recorded as Alpha in riwayat.
     */
    public function rapatSeminggu(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $guru = Guru::find($user->guru_id);

            if (!$guru) {
                return response()->json(['error' => 'Guru tidak ditemukan'], 404);
            }

            $today = Carbon::today('Asia/Jakarta');

            // Get tahun ajaran from user or active
            $tahunAjaranId = $user->tahun_ajaran_id ?? TahunAjaran::getCurrent()?->id;

            // Get rapat from today onwards (unlimited)
            $rapatList = Rapat::where('status', 'Dijadwalkan')
                ->when($tahunAjaranId, fn($q) => $q->where('tahun_ajaran_id', $tahunAjaranId))
                ->whereDate('tanggal', '>=', $today)
                ->where(function ($query) use ($guru) {
                    $query->where('pimpinan_id', $guru->id)
                        ->orWhere('sekretaris_id', $guru->id)
                        ->orWhereJsonContains('peserta_rapat', $guru->id)
                        ->orWhereJsonContains('peserta_rapat', (string) $guru->id);
                })
                ->with(['pimpinanGuru:id,nama,nip', 'sekretarisGuru:id,nama,nip'])
                ->orderBy('tanggal')
                ->orderBy('waktu_mulai')
                ->get();

            // Group by date dynamically
            $rapatByDate = [];

            foreach ($rapatList as $item) {
                $dateStr = Carbon::parse($item->tanggal)->format('Y-m-d');

                // Determine role
                $isPimpinan = $item->pimpinan_id === $guru->id;
                $isSekretaris = $item->sekretaris_id === $guru->id;
                $role = 'peserta';
                if ($isPimpinan)
                    $role = 'pimpinan';
                elseif ($isSekretaris)
                    $role = 'sekretaris';

                // Check absensi status FOR THIS DATE
                $absensi = AbsensiRapat::where('rapat_id', $item->id)->first();
                $statusAbsensi = $this->getRapatAbsensiStatusForDate($item, $guru, $absensi, $isPimpinan, $isSekretaris, $dateStr);

                // Get guru_status (H/I/A) if already attended
                $guruStatus = null;
                if ($absensi) {
                    if ($isPimpinan) {
                        $guruStatus = $absensi->pimpinan_status ?? null;
                    } elseif ($isSekretaris) {
                        $guruStatus = $absensi->sekretaris_status ?? null;
                    } else {
                        $pesertaAbsensi = $absensi->absensi_peserta ?? [];
                        foreach ($pesertaAbsensi as $entry) {
                            if ($entry['guru_id'] == $guru->id) {
                                $guruStatus = $entry['status'] ?? null;
                                break;
                            }
                        }
                    }
                }

                $rapatData = [
                    'id' => $item->id,
                    'agenda_rapat' => $item->agenda_rapat,
                    'tempat' => $item->tempat,
                    'tanggal' => $item->tanggal,
                    'waktu_mulai' => $item->waktu_mulai,
                    'waktu_selesai' => $item->waktu_selesai,
                    'pimpinan' => $item->pimpinanGuru,
                    'sekretaris' => $item->sekretarisGuru,
                    'is_pimpinan' => $isPimpinan,
                    'is_sekretaris' => $isSekretaris,
                    'role' => $role,
                    'status_absensi' => $statusAbsensi,
                    'guru_status' => $guruStatus,
                    'peserta_eksternal' => $item->peserta_eksternal ?? [],
                ];

                if (!isset($rapatByDate[$dateStr])) {
                    $rapatByDate[$dateStr] = [];
                }
                $rapatByDate[$dateStr][] = $rapatData;
            }

            // Sort dates
            ksort($rapatByDate);

            return response()->json([
                'success' => true,
                'rapat' => $rapatByDate
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Helper to determine rapat absensi status
     */
    private function getRapatAbsensiStatus($rapat, $guru, $absensi, $isPimpinan, $isSekretaris)
    {
        $now = Carbon::now('Asia/Jakarta');
        $rapatDate = Carbon::parse($rapat->tanggal)->format('Y-m-d');
        $mulai = Carbon::parse($rapatDate . ' ' . $rapat->waktu_mulai);
        $selesai = Carbon::parse($rapatDate . ' ' . $rapat->waktu_selesai);

        if ($absensi) {
            if ($isSekretaris && $absensi->status === 'submitted') {
                return 'sudah_absen';
            }
            if ($isPimpinan && $absensi->pimpinan_self_attended) {
                return 'sudah_absen';
            }
            if (!$isPimpinan && !$isSekretaris) {
                $pesertaAbsensi = $absensi->absensi_peserta ?? [];
                foreach ($pesertaAbsensi as $entry) {
                    if ($entry['guru_id'] == $guru->id && !empty($entry['self_attended'])) {
                        return 'sudah_absen';
                    }
                }
            }
        }

        if ($now->lt($mulai)) {
            return 'belum_mulai';
        } elseif ($now->between($mulai, $selesai)) {
            return 'sedang_berlangsung';
        } else {
            return 'terlewat';
        }
    }

    /**
     * Helper to determine rapat absensi status for a specific date
     * Used for weekly view where status varies by date
     */
    private function getRapatAbsensiStatusForDate($rapat, $guru, $absensi, $isPimpinan, $isSekretaris, $targetDate)
    {
        $today = Carbon::today('Asia/Jakarta')->format('Y-m-d');
        $now = Carbon::now('Asia/Jakarta');

        // Check if already attended
        if ($absensi) {
            if ($isSekretaris && $absensi->status === 'submitted') {
                return 'sudah_absen';
            }
            if ($isPimpinan && $absensi->pimpinan_self_attended) {
                return 'sudah_absen';
            }
            if (!$isPimpinan && !$isSekretaris) {
                $pesertaAbsensi = $absensi->absensi_peserta ?? [];
                foreach ($pesertaAbsensi as $entry) {
                    if ($entry['guru_id'] == $guru->id && !empty($entry['self_attended'])) {
                        return 'sudah_absen';
                    }
                }
            }
        }

        // If target date is in the future → belum_mulai
        if ($targetDate > $today) {
            return 'belum_mulai';
        }

        // NOTE: 'terlewat' for past dates disabled for now
        // Will be useful for Riwayat page later
        // if ($targetDate < $today) {
        //     return 'terlewat';
        // }

        // Target date is today - check time
        $mulai = Carbon::parse($targetDate . ' ' . $rapat->waktu_mulai);
        $selesai = Carbon::parse($targetDate . ' ' . $rapat->waktu_selesai);

        if ($now->lt($mulai)) {
            return 'belum_mulai';
        } elseif ($now->between($mulai, $selesai)) {
            return 'sedang_berlangsung';
        } else {
            return 'terlewat';
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

        // Get peserta list (exclude pimpinan/sekretaris to avoid duplicates)
        $pesertaRapat = is_array($rapat->peserta_rapat) ? $rapat->peserta_rapat : [];
        $excludeIds = array_filter([$rapat->pimpinan_id, $rapat->sekretaris_id]);
        $pesertaList = [];
        if (!empty($pesertaRapat)) {
            $filteredIds = array_diff($pesertaRapat, $excludeIds);
            $pesertaList = Guru::whereIn('id', $filteredIds)
                ->where('nama', '!=', 'Semua Guru')
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
            'status' => 'required|in:H,S,I,A',
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

        // Log activity
        ActivityLog::log(
            'attendance',
            $absensi,
            "Absensi pimpinan rapat: {$rapat->nama_rapat} (Status: {$validated['status']})"
        );

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
            'status' => 'required|in:H,S,I,A',
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

        // Log activity
        ActivityLog::log(
            'attendance',
            $absensi,
            "Absensi peserta rapat: {$rapat->nama_rapat} (Status: {$validated['status']})"
        );

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
            'pimpinan_status' => 'required|in:H,S,I,A',
            'pimpinan_keterangan' => 'nullable|string',
            'sekretaris_status' => 'required|in:H,S,I,A',
            'sekretaris_keterangan' => 'nullable|string',
            'absensi_peserta' => 'required|array',
            'absensi_peserta.*.guru_id' => 'required|integer',
            'absensi_peserta.*.status' => 'required|in:H,S,I,A',
            'absensi_peserta.*.keterangan' => 'nullable|string',
            'notulensi' => 'required|string',
            'foto_rapat' => 'required|array|min:2|max:4',
            'foto_rapat.*' => 'required|string', // Base64 images
            'peserta_eksternal' => 'nullable|array',
            'peserta_eksternal.*.nama' => 'required|string|max:100',
            'peserta_eksternal.*.jabatan' => 'nullable|string|max:100',
            'peserta_eksternal.*.ttd' => 'nullable|string', // Base64 canvas TTD
            'ttd_overrides' => 'nullable|array', // Per-peserta TTD overrides {guru_id: base64}
        ]);

        $rapat = Rapat::find($validated['rapat_id']);

        // Save tamu TTDs as files and update peserta_eksternal with file paths
        if (array_key_exists('peserta_eksternal', $validated)) {
            $pesertaEksternal = $validated['peserta_eksternal'];
            foreach ($pesertaEksternal as $idx => &$pe) {
                if (!empty($pe['ttd'])) {
                    $base64 = preg_replace('/^data:image\/\w+;base64,/', '', $pe['ttd']);
                    $imageData = base64_decode($base64);
                    if ($imageData) {
                        $filename = 'ttd_tamu_' . $rapat->id . '_' . $idx . '_' . time() . '.png';
                        $path = 'ttd/tamu/' . $filename;
                        \Storage::disk('public')->put($path, $imageData);
                        $pe['ttd'] = asset('storage/' . $path);
                    } else {
                        unset($pe['ttd']);
                    }
                }
            }
            unset($pe);
            $rapat->update(['peserta_eksternal' => $pesertaEksternal]);
        }

        // Handle per-peserta TTD overrides (session-specific canvas signatures)
        $ttdOverrides = $request->input('ttd_overrides', []);
        if (!empty($ttdOverrides) && is_array($ttdOverrides)) {
            foreach ($ttdOverrides as $guruId => $ttdBase64) {
                if (!$ttdBase64)
                    continue;
                $base64 = preg_replace('/^data:image\/\w+;base64,/', '', $ttdBase64);
                $imageData = base64_decode($base64);
                if ($imageData) {
                    $guruObj = \App\Models\Guru::find($guruId);
                    if ($guruObj) {
                        // Delete old TTD if exists
                        if ($guruObj->ttd && \Storage::disk('public')->exists($guruObj->ttd)) {
                            \Storage::disk('public')->delete($guruObj->ttd);
                        }
                        $filename = 'ttd_' . $guruId . '_' . time() . '.png';
                        $path = 'ttd/guru/' . $filename;
                        \Storage::disk('public')->put($path, $imageData);
                        $guruObj->update(['ttd' => $path]);
                    }
                }
            }
        }

        // Verify guru is the sekretaris or pimpinan
        if ($rapat->sekretaris_id !== $guru->id && $rapat->pimpinan_id !== $guru->id) {
            return response()->json(['error' => 'Hanya sekretaris atau pimpinan yang bisa menyimpan absensi'], 403);
        }

        $today = Carbon::today('Asia/Jakarta');

        // Check if already submitted (allow update if unlocked by admin)
        $existing = AbsensiRapat::where('rapat_id', $rapat->id)->first();

        // Check if rapat is unlocked (use the built-in method that handles value casting)
        $isUnlocked = AppSetting::isAttendanceUnlocked();

        if ($existing && $existing->status === 'submitted' && !$isUnlocked) {
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

        // Compress foto_rapat images before saving
        $compressedFotos = \App\Services\ImageService::compressBase64Multiple($validated['foto_rapat']);

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
                'foto_rapat' => $compressedFotos,
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
                'foto_rapat' => $compressedFotos,
                'status' => 'submitted',
            ]);
        }

        // Log activity
        ActivityLog::log(
            'attendance',
            $existing ?? AbsensiRapat::where('rapat_id', $rapat->id)->first(),
            "Menyimpan absensi rapat: {$rapat->nama_rapat}"
        );

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

        if ($isPimpinan) {
            // Check if pimpinan self-attended OR sekretaris submitted
            if ($absensi->pimpinan_self_attended || $absensi->status === 'submitted') {
                return response()->json([
                    'success' => true,
                    'attended' => true,
                    'status' => $absensi->pimpinan_status ?? 'A',
                    'keterangan' => $absensi->pimpinan_keterangan,
                    'role' => 'pimpinan'
                ]);
            }
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

        // Check peserta - return status if self_attended OR sekretaris submitted
        $pesertaAbsensi = $absensi->absensi_peserta ?? [];
        foreach ($pesertaAbsensi as $entry) {
            if ($entry['guru_id'] == $guru->id) {
                // Return status if self-attended OR sekretaris has submitted the attendance
                if (!empty($entry['self_attended']) || $absensi->status === 'submitted') {
                    return response()->json([
                        'success' => true,
                        'attended' => true,
                        'status' => $entry['status'] ?? 'A',
                        'keterangan' => $entry['keterangan'] ?? null,
                        'role' => 'peserta'
                    ]);
                }
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

    /**
     * Get existing absensi data for a rapat (for loading into modal).
     */
    public function getAbsensiRapat(Request $request, $id): JsonResponse
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

        // Check if guru is authorized (pimpinan, sekretaris, or peserta)
        $isPimpinan = $rapat->pimpinan_id === $guru->id;
        $isSekretaris = $rapat->sekretaris_id === $guru->id;
        $isPeserta = in_array($guru->id, $rapat->peserta ?? []);

        if (!$isPimpinan && !$isSekretaris && !$isPeserta) {
            return response()->json(['error' => 'Anda tidak memiliki akses ke rapat ini'], 403);
        }

        // Get existing absensi
        $absensi = AbsensiRapat::where('rapat_id', $id)->first();

        if (!$absensi) {
            return response()->json([
                'success' => true,
                'has_absensi' => false,
                'data' => null
            ]);
        }

        return response()->json([
            'success' => true,
            'has_absensi' => true,
            'data' => [
                'sekretaris_status' => $absensi->sekretaris_status,
                'sekretaris_keterangan' => $absensi->sekretaris_keterangan,
                'pimpinan_status' => $absensi->pimpinan_status,
                'pimpinan_keterangan' => $absensi->pimpinan_keterangan,
                'absensi_peserta' => $absensi->absensi_peserta ?? [],
                'notulensi' => $absensi->notulensi,
                'foto_rapat' => $absensi->foto_rapat ?? [],
                'status' => $absensi->status,
            ]
        ]);
    }
}
