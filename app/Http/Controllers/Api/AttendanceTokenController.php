<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AttendanceToken;
use App\Models\AbsensiMengajar;
use App\Models\AbsensiSiswa;
use App\Models\AbsensiKegiatan;
use App\Models\AbsensiRapat;
use App\Models\NilaiSiswa;
use App\Models\Siswa;
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

        // For mengajar type, load siswa list from jadwal->kelas
        $siswaList = collect();
        $guruList = collect();
        if ($attendanceToken->type === 'mengajar' && $reference) {
            $jadwal = \App\Models\Jadwal::with(['kelas.siswa'])->find($attendanceToken->reference_id);
            if ($jadwal && $jadwal->kelas) {
                // Get daily absensi siswa for this kelas + tanggal
                $dailyAbsensi = AbsensiSiswa::where('kelas_id', $jadwal->kelas_id)
                    ->where('tanggal', $attendanceToken->tanggal->toDateString())
                    ->get()
                    ->keyBy('siswa_id');

                $siswaList = $jadwal->kelas->siswa()
                    ->where('status', 'Aktif')
                    ->orderBy('nama')
                    ->get()
                    ->map(function ($siswa) use ($dailyAbsensi) {
                        $absensiRecord = $dailyAbsensi->get($siswa->id);
                        return [
                            'id' => $siswa->id,
                            'nama' => $siswa->nama,
                            'nis' => $siswa->nis,
                            'status' => $absensiRecord?->status ?? 'H',
                            'keterangan' => $absensiRecord?->keterangan ?? '',
                        ];
                    });
            }

            // Load guru list for guru pengganti dropdown
            $guruList = \App\Models\Guru::where('status', 'aktif')
                ->orderBy('nama')
                ->get(['id', 'nama', 'nip']);
        }

        // Detect role and load coordinator-specific data
        $role = 'peserta'; // default
        $coordinatorData = [];
        $existingAbsensi = null;

        if ($attendanceToken->type === 'kegiatan' && $reference) {
            $isPJ = ($reference->penanggung_jawab_id == $attendanceToken->guru_id);
            $role = $isPJ ? 'penanggung_jawab' : 'pendamping';

            if ($isPJ) {
                // Load pendamping guru list
                $guruPendamping = is_array($reference->guru_pendamping) ? $reference->guru_pendamping : [];
                $pendampingList = [];
                if (!empty($guruPendamping)) {
                    $pendampingList = \App\Models\Guru::whereIn('id', $guruPendamping)
                        ->select('id', 'nama', 'nip')
                        ->get();
                }

                // Load siswa from kelas peserta
                $kegiatanSiswaList = collect();
                if (!empty($reference->kelas_peserta)) {
                    $kegiatanSiswaList = \App\Models\Siswa::whereIn('kelas_id', $reference->kelas_peserta)
                        ->where('status', 'Aktif')
                        ->select('id', 'nama', 'nis', 'kelas_id')
                        ->with('kelas:id,nama_kelas')
                        ->orderBy('nama')
                        ->get()
                        ->map(fn($s) => [
                            'id' => $s->id,
                            'nama' => $s->nama,
                            'nis' => $s->nis,
                            'kelas' => $s->kelas->nama_kelas ?? '-',
                        ]);
                }

                // Load kelas peserta names
                $kelasList = [];
                if (!empty($reference->kelas_peserta)) {
                    $kelasList = \App\Models\Kelas::whereIn('id', $reference->kelas_peserta)
                        ->select('id', 'nama_kelas')
                        ->get();
                }

                // Load existing absensi
                $existingAbsensi = AbsensiKegiatan::where('kegiatan_id', $reference->id)->first();

                $coordinatorData = [
                    'pendamping_list' => $pendampingList,
                    'siswa_list' => $kegiatanSiswaList,
                    'kelas_list' => $kelasList,
                ];
            }
        } elseif ($attendanceToken->type === 'rapat' && $reference) {
            $isPimpinan = ($reference->pimpinan_id == $attendanceToken->guru_id);
            $isSekretaris = ($reference->sekretaris_id == $attendanceToken->guru_id);

            if ($isPimpinan) {
                $role = 'pimpinan';
            } elseif ($isSekretaris) {
                $role = 'sekretaris';

                // Load peserta list (exclude pimpinan/sekretaris)
                $pesertaRapat = is_array($reference->peserta_rapat) ? $reference->peserta_rapat : [];
                $excludeIds = array_filter([$reference->pimpinan_id, $reference->sekretaris_id]);
                $pesertaList = [];
                if (!empty($pesertaRapat)) {
                    $filteredIds = array_diff($pesertaRapat, $excludeIds);
                    $pesertaList = \App\Models\Guru::whereIn('id', $filteredIds)
                        ->where('nama', '!=', 'Semua Guru')
                        ->select('id', 'nama', 'nip')
                        ->get();
                }

                // Load pimpinan/sekretaris guru info
                $pimpinanGuru = \App\Models\Guru::find($reference->pimpinan_id, ['id', 'nama', 'nip']);
                $sekretarisGuru = \App\Models\Guru::find($reference->sekretaris_id, ['id', 'nama', 'nip']);

                // Load existing absensi
                $existingAbsensi = AbsensiRapat::where('rapat_id', $reference->id)->first();

                $coordinatorData = [
                    'peserta_list' => $pesertaList,
                    'pimpinan_guru' => $pimpinanGuru,
                    'sekretaris_guru' => $sekretarisGuru,
                ];
            } else {
                $role = 'peserta';
            }
        }

        // Check existing attendance status for same-day re-editing
        $existingStatus = null;
        if ($attendanceToken->used_at) {
            if ($attendanceToken->type === 'rapat' && $reference) {
                $absensiRapat = $existingAbsensi ?? AbsensiRapat::where('rapat_id', $attendanceToken->reference_id)->first();
                if ($absensiRapat) {
                    if ($reference->pimpinan_id == $attendanceToken->guru_id) {
                        $existingStatus = ['status' => $absensiRapat->pimpinan_status ?? 'H', 'keterangan' => $absensiRapat->pimpinan_keterangan ?? ''];
                    } else if ($reference->sekretaris_id == $attendanceToken->guru_id) {
                        $existingStatus = ['status' => $absensiRapat->sekretaris_status ?? 'H', 'keterangan' => $absensiRapat->sekretaris_keterangan ?? ''];
                    } else {
                        $peserta = $absensiRapat->absensi_peserta ?? [];
                        foreach ($peserta as $p) {
                            if (($p['guru_id'] ?? 0) == $attendanceToken->guru_id) {
                                $existingStatus = ['status' => $p['status'] ?? 'H', 'keterangan' => $p['keterangan'] ?? ''];
                                break;
                            }
                        }
                    }
                }
            } elseif ($attendanceToken->type === 'kegiatan' && $reference) {
                $absensiKegiatan = $existingAbsensi ?? AbsensiKegiatan::where('kegiatan_id', $attendanceToken->reference_id)->first();
                if ($absensiKegiatan) {
                    if ($reference->penanggung_jawab_id == $attendanceToken->guru_id) {
                        $existingStatus = ['status' => $absensiKegiatan->pj_status ?? 'H', 'keterangan' => $absensiKegiatan->pj_keterangan ?? ''];
                    } else {
                        $pendamping = $absensiKegiatan->absensi_pendamping ?? [];
                        foreach ($pendamping as $p) {
                            if (($p['guru_id'] ?? 0) == $attendanceToken->guru_id) {
                                $existingStatus = ['status' => $p['status'] ?? 'H', 'keterangan' => $p['keterangan'] ?? ''];
                                break;
                            }
                        }
                    }
                }
            }
        }

        return view('attendance_token.form', [
            'token' => $attendanceToken,
            'reference' => $reference,
            'siswaList' => $siswaList,
            'guruList' => $guruList,
            'existingStatus' => $existingStatus,
            'role' => $role,
            'coordinatorData' => $coordinatorData,
            'existingAbsensi' => $existingAbsensi,
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
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->view('attendance_token.invalid', [
                'message' => 'Terjadi kesalahan saat menyimpan absensi: ' . $e->getMessage()
            ], 500);
        }
    }

    protected function submitMengajar(AttendanceToken $token, Request $request, Carbon $now): void
    {
        $jadwal = \App\Models\Jadwal::with(['kelas', 'mapel', 'guru'])->find($token->reference_id);
        $guruStatus = $request->input('guru_status', 'H');
        $jenisKegiatan = $request->input('jenis_kegiatan', 'mengajar');
        $jenisUlangan = $jenisKegiatan === 'ulangan' ? ($request->input('jenis_ulangan', 'ulangan_harian')) : null;
        $ringkasanMateri = $request->input('ringkasan_materi');
        $beritaAcara = $request->input('berita_acara');

        // Auto-generate ringkasan for ulangan
        if ($jenisKegiatan === 'ulangan' && empty($ringkasanMateri)) {
            $labelUlangan = ['ulangan_harian' => 'Penilaian Harian', 'uts' => 'UTS', 'uas' => 'UAS', 'quiz' => 'Quiz'];
            $judul = $request->input('judul_ulangan');
            $suffix = !empty($judul) ? $judul : ($jadwal?->mapel?->nama_mapel ?? 'Mapel');
            $ringkasanMateri = ($labelUlangan[$jenisUlangan] ?? 'Penilaian') . ': ' . $suffix;
        }

        $existing = AbsensiMengajar::where('jadwal_id', $token->reference_id)
            ->whereDate('tanggal', $token->tanggal)
            ->first();

        if ($existing) {
            // Update existing
            $existing->update([
                'guru_status' => $guruStatus,
                'guru_keterangan' => in_array($guruStatus, ['I', 'S', 'A'])
                    ? ($request->input('guru_keterangan') ?? 'Hadir (via link WA)')
                    : null,
                'guru_tugas_id' => in_array($guruStatus, ['I', 'S']) ? ($request->input('guru_tugas_id') ?: null) : null,
                'tugas_siswa' => in_array($guruStatus, ['I', 'S']) ? ($request->input('tugas_siswa') ?: null) : null,
                'ringkasan_materi' => $guruStatus === 'H' ? ($jenisKegiatan === 'ulangan' ? $ringkasanMateri : ($ringkasanMateri ?? $existing->ringkasan_materi)) : null,
                'berita_acara' => $guruStatus === 'H' ? ($beritaAcara ?? $existing->berita_acara) : null,
                'jenis_kegiatan' => $jenisKegiatan,
                'jenis_ulangan' => $jenisUlangan,
                'absensi_time' => $now,
                'status' => 'hadir',
            ]);

            // Save student attendance
            if ($guruStatus === 'H' && $jadwal && $jadwal->kelas) {
                $this->saveDailyAbsensiSiswaFromRequest($request, $existing, $jadwal);
            }

            // Save nilai siswa if ulangan
            if ($jenisKegiatan === 'ulangan') {
                $this->saveNilaiSiswa($request, $existing);
            }
        } else {
            // Create new
            $absensi = AbsensiMengajar::create([
                'jadwal_id' => $token->reference_id,
                'guru_id' => $token->guru_id,
                'snapshot_kelas' => $jadwal?->kelas?->nama_kelas,
                'snapshot_mapel' => $jadwal?->mapel?->nama_mapel,
                'snapshot_jam' => $jadwal?->jam_mulai . '-' . $jadwal?->jam_selesai,
                'snapshot_hari' => $jadwal?->hari,
                'snapshot_guru_nama' => $token->guru->nama,
                'tanggal' => $token->tanggal,
                'ringkasan_materi' => $guruStatus === 'H' ? $ringkasanMateri : null,
                'berita_acara' => $guruStatus === 'H' ? $beritaAcara : null,
                'status' => 'hadir',
                'jenis_kegiatan' => $jenisKegiatan,
                'jenis_ulangan' => $jenisUlangan,
                'guru_status' => $guruStatus,
                'guru_keterangan' => in_array($guruStatus, ['I', 'S', 'A'])
                    ? ($request->input('guru_keterangan') ?? 'Hadir (via link WA)')
                    : null,
                'guru_tugas_id' => in_array($guruStatus, ['I', 'S']) ? ($request->input('guru_tugas_id') ?: null) : null,
                'tugas_siswa' => in_array($guruStatus, ['I', 'S']) ? ($request->input('tugas_siswa') ?: null) : null,
                'absensi_time' => $now,
            ]);

            // Save student attendance
            if ($guruStatus === 'H' && $jadwal && $jadwal->kelas) {
                $this->saveDailyAbsensiSiswaFromRequest($request, $absensi, $jadwal);
            }

            // Save nilai siswa if ulangan
            if ($jenisKegiatan === 'ulangan') {
                $this->saveNilaiSiswa($request, $absensi);
            }
        }
    }

    /**
     * Save daily absensi siswa from form request
     */
    private function saveDailyAbsensiSiswaFromRequest(Request $request, AbsensiMengajar $absensi, $jadwal): void
    {
        $absensiSiswaData = $request->input('absensi_siswa', []);
        if (empty($absensiSiswaData))
            return;

        // Parse: absensi_siswa[{siswa_id}] = status, absensi_siswa_ket[{siswa_id}] = keterangan
        $counts = ['siswa_hadir' => 0, 'siswa_sakit' => 0, 'siswa_izin' => 0, 'siswa_alpha' => 0];

        foreach ($absensiSiswaData as $siswaId => $status) {
            $keterangan = $request->input("absensi_siswa_ket.{$siswaId}", null);

            if ($status === 'H') {
                AbsensiSiswa::where('siswa_id', $siswaId)
                    ->where('tanggal', $absensi->tanggal->toDateString())
                    ->delete();
                $counts['siswa_hadir']++;
            } else {
                AbsensiSiswa::updateOrCreate(
                    ['siswa_id' => $siswaId, 'tanggal' => $absensi->tanggal->toDateString()],
                    [
                        'kelas_id' => $jadwal->kelas_id,
                        'status' => $status,
                        'keterangan' => $keterangan,
                    ]
                );
                match ($status) {
                    'S' => $counts['siswa_sakit']++,
                    'I' => $counts['siswa_izin']++,
                    'A' => $counts['siswa_alpha']++,
                    default => null,
                };
            }
        }

        $absensi->update($counts);
    }

    /**
     * Save nilai siswa from form request
     */
    private function saveNilaiSiswa(Request $request, AbsensiMengajar $absensi): void
    {
        $nilaiData = $request->input('nilai_siswa', []);
        if (empty($nilaiData))
            return;

        foreach ($nilaiData as $siswaId => $nilai) {
            if ($nilai !== null && $nilai !== '') {
                NilaiSiswa::updateOrCreate(
                    ['absensi_mengajar_id' => $absensi->id, 'siswa_id' => $siswaId],
                    ['nilai' => (float) $nilai, 'keterangan' => null]
                );
            }
        }
    }

    protected function submitKegiatan(AttendanceToken $token, Request $request, Carbon $now): void
    {
        $kegiatan = \App\Models\Kegiatan::find($token->reference_id);
        if (!$kegiatan)
            return;

        $isPJ = ($kegiatan->penanggung_jawab_id == $token->guru_id);
        $existing = AbsensiKegiatan::where('kegiatan_id', $token->reference_id)->first();

        if ($isPJ && $request->has('is_coordinator_form')) {
            // ===== FULL PJ FORM (same as GuruKegiatanController::simpanAbsensi) =====
            $pjStatus = $request->input('pj_status', 'H');
            $pjKeterangan = $request->input('pj_keterangan') ?: null;
            $beritaAcara = $request->input('berita_acara') ?: null;
            $absensiPendamping = $request->input('absensi_pendamping', []);
            $absensiSiswa = $request->input('absensi_siswa', []);
            $fotoKegiatan = $request->input('foto_kegiatan', []);

            // Merge pendamping - preserve self-attended data from existing
            $mergedPendamping = [];
            $existingPendamping = $existing ? ($existing->absensi_pendamping ?? []) : [];
            foreach ($absensiPendamping as $newEntry) {
                $found = false;
                foreach ($existingPendamping as $existingEntry) {
                    if ($existingEntry['guru_id'] == $newEntry['guru_id']) {
                        $mergedEntry = $newEntry;
                        if (!empty($existingEntry['self_attended'])) {
                            $mergedEntry['self_attended'] = true;
                            $mergedEntry['attended_at'] = $existingEntry['attended_at'] ?? null;
                        }
                        $mergedPendamping[] = $mergedEntry;
                        $found = true;
                        break;
                    }
                }
                if (!$found) {
                    $mergedPendamping[] = $newEntry;
                }
            }

            // Compress images
            $compressedFotos = \App\Services\ImageService::compressBase64Multiple($fotoKegiatan);

            if ($existing) {
                $existing->update([
                    'pj_status' => $pjStatus,
                    'pj_keterangan' => $pjKeterangan,
                    'absensi_pendamping' => $mergedPendamping,
                    'absensi_siswa' => $absensiSiswa,
                    'berita_acara' => $beritaAcara,
                    'foto_kegiatan' => $compressedFotos,
                    'status' => 'submitted',
                ]);
            } else {
                AbsensiKegiatan::create([
                    'kegiatan_id' => $kegiatan->id,
                    'tanggal' => $token->tanggal,
                    'penanggung_jawab_id' => $kegiatan->penanggung_jawab_id,
                    'pj_status' => $pjStatus,
                    'pj_keterangan' => $pjKeterangan,
                    'absensi_pendamping' => $mergedPendamping,
                    'absensi_siswa' => $absensiSiswa,
                    'berita_acara' => $beritaAcara,
                    'foto_kegiatan' => $compressedFotos,
                    'status' => 'submitted',
                ]);
            }
        } else {
            // ===== SIMPLE SELF-ATTENDANCE (pendamping or fallback) =====
            $status = $request->input('status', 'H');
            $keterangan = $request->input('keterangan', '') ?: null;

            if ($existing) {
                if ($isPJ) {
                    $existing->update([
                        'pj_status' => $status,
                        'pj_keterangan' => $keterangan,
                    ]);
                }

                $pendamping = $existing->absensi_pendamping ?? [];
                $found = false;
                foreach ($pendamping as &$p) {
                    if (($p['guru_id'] ?? 0) == $token->guru_id) {
                        $p['status'] = $status;
                        $p['keterangan'] = $keterangan;
                        $p['self_attended'] = true;
                        $p['attended_at'] = $now->toISOString();
                        $found = true;
                    }
                }
                if (!$found && !$isPJ) {
                    $pendamping[] = [
                        'guru_id' => $token->guru_id,
                        'status' => $status,
                        'keterangan' => $keterangan,
                        'self_attended' => true,
                        'attended_at' => $now->toISOString(),
                    ];
                }
                $existing->update(['absensi_pendamping' => $pendamping]);
            } else {
                $pendampingData = [];
                if (!$isPJ) {
                    $pendampingData[] = [
                        'guru_id' => $token->guru_id,
                        'status' => $status,
                        'keterangan' => $keterangan,
                        'self_attended' => true,
                        'attended_at' => $now->toISOString(),
                    ];
                }
                AbsensiKegiatan::create([
                    'kegiatan_id' => $kegiatan->id,
                    'tanggal' => $token->tanggal,
                    'penanggung_jawab_id' => $kegiatan->penanggung_jawab_id,
                    'pj_status' => $isPJ ? $status : 'A',
                    'pj_keterangan' => $isPJ ? $keterangan : null,
                    'absensi_pendamping' => $pendampingData,
                    'absensi_siswa' => [],
                    'foto_kegiatan' => [],
                    'status' => 'draft',
                ]);
            }
        }
    }

    protected function submitRapat(AttendanceToken $token, Request $request, Carbon $now): void
    {
        $rapat = \App\Models\Rapat::find($token->reference_id);
        if (!$rapat)
            return;

        $isPimpinan = ($rapat->pimpinan_id == $token->guru_id);
        $isSekretaris = ($rapat->sekretaris_id == $token->guru_id);
        $existing = AbsensiRapat::where('rapat_id', $token->reference_id)->first();

        if ($isSekretaris && $request->has('is_coordinator_form')) {
            // ===== FULL SEKRETARIS FORM (same as GuruRapatController::absensiSekretaris) =====
            $pimpinanStatus = $request->input('pimpinan_status', 'H');
            $pimpinanKeterangan = $request->input('pimpinan_keterangan') ?: null;
            $sekretarisStatus = $request->input('sekretaris_status', 'H');
            $sekretarisKeterangan = $request->input('sekretaris_keterangan') ?: null;
            $notulensi = $request->input('notulensi', '');
            $absensiPeserta = $request->input('absensi_peserta', []);
            $fotoRapat = $request->input('foto_rapat', []);

            // Merge peserta - preserve self-attended data
            $mergedPeserta = [];
            $existingPeserta = $existing ? ($existing->absensi_peserta ?? []) : [];
            foreach ($absensiPeserta as $newEntry) {
                $found = false;
                foreach ($existingPeserta as $existingEntry) {
                    if ($existingEntry['guru_id'] == $newEntry['guru_id']) {
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

            // Preserve pimpinan self-attended status
            $pimpinanSelfAttended = $existing ? $existing->pimpinan_self_attended : false;
            $pimpinanAttendedAt = $existing ? $existing->pimpinan_attended_at : null;

            // Process fotos
            $processedFotos = [];
            foreach ($fotoRapat as $foto) {
                if (str_starts_with($foto, 'data:image') || str_starts_with($foto, '/9j/') || str_starts_with($foto, 'iVBOR')) {
                    $processedFotos[] = \App\Services\ImageService::compressBase64($foto);
                } else {
                    $processedFotos[] = $foto;
                }
            }

            if ($existing) {
                $existing->update([
                    'pimpinan_status' => $pimpinanStatus,
                    'pimpinan_keterangan' => $pimpinanKeterangan,
                    'pimpinan_self_attended' => $pimpinanSelfAttended,
                    'pimpinan_attended_at' => $pimpinanAttendedAt,
                    'sekretaris_status' => $sekretarisStatus,
                    'sekretaris_keterangan' => $sekretarisKeterangan,
                    'absensi_peserta' => $mergedPeserta,
                    'notulensi' => $notulensi,
                    'foto_rapat' => $processedFotos,
                    'status' => 'submitted',
                ]);
            } else {
                AbsensiRapat::create([
                    'rapat_id' => $rapat->id,
                    'tanggal' => $token->tanggal,
                    'pimpinan_status' => $pimpinanStatus,
                    'pimpinan_keterangan' => $pimpinanKeterangan,
                    'sekretaris_status' => $sekretarisStatus,
                    'sekretaris_keterangan' => $sekretarisKeterangan,
                    'absensi_peserta' => $mergedPeserta,
                    'notulensi' => $notulensi,
                    'foto_rapat' => $processedFotos,
                    'status' => 'submitted',
                ]);
            }
        } else {
            // ===== SIMPLE SELF-ATTENDANCE (pimpinan, peserta, or fallback) =====
            $status = $request->input('status', 'H');
            $keterangan = $request->input('keterangan', '') ?: null;

            if ($existing) {
                if ($isPimpinan) {
                    $existing->update([
                        'pimpinan_status' => $status,
                        'pimpinan_keterangan' => $keterangan,
                        'pimpinan_self_attended' => true,
                        'pimpinan_attended_at' => $now,
                    ]);
                }

                if ($isSekretaris) {
                    $existing->update([
                        'sekretaris_status' => $status,
                        'sekretaris_keterangan' => $keterangan,
                    ]);
                }

                // Update peserta array
                $peserta = $existing->absensi_peserta ?? [];
                $found = false;
                foreach ($peserta as &$p) {
                    if (($p['guru_id'] ?? 0) == $token->guru_id) {
                        $p['status'] = $status;
                        $p['keterangan'] = $keterangan;
                        $p['self_attended'] = true;
                        $p['attended_at'] = $now->toDateTimeString();
                        $found = true;
                    }
                }
                if (!$found && !$isPimpinan && !$isSekretaris) {
                    $peserta[] = [
                        'guru_id' => $token->guru_id,
                        'status' => $status,
                        'keterangan' => $keterangan,
                        'self_attended' => true,
                        'attended_at' => $now->toDateTimeString(),
                    ];
                }
                $existing->update(['absensi_peserta' => $peserta]);
            } else {
                $pesertaData = [];
                if (!$isPimpinan && !$isSekretaris) {
                    $pesertaData[] = [
                        'guru_id' => $token->guru_id,
                        'status' => $status,
                        'keterangan' => $keterangan,
                        'self_attended' => true,
                        'attended_at' => $now->toDateTimeString(),
                    ];
                }
                AbsensiRapat::create([
                    'rapat_id' => $rapat->id,
                    'tanggal' => $token->tanggal,
                    'pimpinan_status' => $isPimpinan ? $status : null,
                    'pimpinan_keterangan' => $isPimpinan ? $keterangan : null,
                    'pimpinan_self_attended' => $isPimpinan,
                    'pimpinan_attended_at' => $isPimpinan ? $now : null,
                    'sekretaris_status' => $isSekretaris ? $status : null,
                    'sekretaris_keterangan' => $isSekretaris ? $keterangan : null,
                    'absensi_peserta' => $pesertaData,
                    'status' => 'draft',
                ]);
            }
        }
    }
}

