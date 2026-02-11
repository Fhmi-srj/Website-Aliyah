<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\TahunAjaran;
use App\Models\Kelas;
use App\Models\Siswa;
use App\Models\SiswaKelas;
use App\Models\Jadwal;
use App\Models\Kegiatan;
use App\Models\Kalender;
use App\Models\Ekskul;
use App\Models\Rapat;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class TahunAjaranWizardController extends Controller
{
    /**
     * Get preview data from source tahun ajaran
     */
    public function getPreviewData(Request $request): JsonResponse
    {
        $sourceTahunId = $request->query('source_tahun_id');

        if (!$sourceTahunId) {
            return response()->json([
                'success' => false,
                'message' => 'Source tahun ajaran ID required'
            ], 400);
        }

        $tahunAjaran = TahunAjaran::find($sourceTahunId);

        // Get data counts from source
        $kelas = Kelas::where('tahun_ajaran_id', $sourceTahunId)->get();
        $siswa = Siswa::where('tahun_ajaran_id', $sourceTahunId)
            ->with('kelas:id,nama_kelas,tingkat')
            ->get();
        $jadwal = Jadwal::where('tahun_ajaran_id', $sourceTahunId)->count();
        $kegiatan = Kegiatan::where('tahun_ajaran_id', $sourceTahunId)->count();
        $kalender = Kalender::where('tahun_ajaran_id', $sourceTahunId)->count();
        $ekskul = Ekskul::where('tahun_ajaran_id', $sourceTahunId)->count();
        $rapat = Rapat::where('tahun_ajaran_id', $sourceTahunId)->count();

        return response()->json([
            'success' => true,
            'data' => [
                'tahun_ajaran' => $tahunAjaran,
                'kelas' => $kelas,
                'siswa' => $siswa,
                'counts' => [
                    'kelas' => $kelas->count(),
                    'siswa' => $siswa->count(),
                    'jadwal' => $jadwal,
                    'kegiatan' => $kegiatan,
                    'kalender' => $kalender,
                    'ekskul' => $ekskul,
                    'rapat' => $rapat
                ]
            ]
        ]);
    }

    /**
     * Get student mappings with auto-promotion logic
     */
    public function getStudentMappings(Request $request): JsonResponse
    {
        $sourceTahunId = $request->query('source_tahun_id');

        // Map Roman numerals to integers
        $romanToInt = ['X' => 10, 'XI' => 11, 'XII' => 12, '10' => 10, '11' => 11, '12' => 12];

        // Get siswaKelas records for this tahun_ajaran via pivot table
        $siswaKelasRecords = SiswaKelas::where('tahun_ajaran_id', $sourceTahunId)
            ->whereIn('status', ['Aktif', 'Naik', 'Tinggal']) // Only active students
            ->with(['siswa', 'kelas:id,nama_kelas,tingkat'])
            ->get();

        // If pivot table has records, use them
        if ($siswaKelasRecords->isNotEmpty()) {
            $mappings = $siswaKelasRecords->map(function ($sk) use ($romanToInt) {
                $tingkatStr = $sk->kelas->tingkat ?? 'X';
                $currentTingkat = $romanToInt[$tingkatStr] ?? 10;
                $nextTingkat = min($currentTingkat + 1, 12);

                // Default action based on current grade
                $defaultAction = 'naik';
                if ($currentTingkat >= 12) {
                    $defaultAction = 'lulus';
                }

                return [
                    'siswa_id' => $sk->siswa_id,
                    'nama' => $sk->siswa->nama,
                    'nis' => $sk->siswa->nis,
                    'current_kelas' => $sk->kelas?->nama_kelas,
                    'current_tingkat' => $currentTingkat,
                    'suggested_tingkat' => $nextTingkat,
                    'action' => $defaultAction
                ];
            });
        } else {
            // Fallback: Get siswa with tahun_ajaran_id (legacy approach)
            $siswa = Siswa::where('tahun_ajaran_id', $sourceTahunId)
                ->with('kelas:id,nama_kelas,tingkat')
                ->where('status', 'Aktif')
                ->get();

            // If still empty, get all aktif siswa (very legacy data)
            if ($siswa->isEmpty()) {
                $siswa = Siswa::with('kelas:id,nama_kelas,tingkat')
                    ->where('status', 'Aktif')
                    ->get();
            }

            $mappings = $siswa->map(function ($s) use ($romanToInt) {
                $tingkatStr = $s->kelas->tingkat ?? 'X';
                $currentTingkat = $romanToInt[$tingkatStr] ?? 10;
                $nextTingkat = min($currentTingkat + 1, 12);

                $defaultAction = 'naik';
                if ($currentTingkat >= 12) {
                    $defaultAction = 'lulus';
                }

                return [
                    'siswa_id' => $s->id,
                    'nama' => $s->nama,
                    'nis' => $s->nis,
                    'current_kelas' => $s->kelas?->nama_kelas,
                    'current_tingkat' => $currentTingkat,
                    'suggested_tingkat' => $nextTingkat,
                    'action' => $defaultAction
                ];
            });
        }

        return response()->json([
            'success' => true,
            'data' => $mappings->values()
        ]);
    }

    /**
     * Execute the wizard - create new tahun ajaran with copied data
     */
    public function executeWizard(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nama' => 'required|string|unique:tahun_ajaran,nama',
            'tanggal_mulai' => 'required|date',
            'tanggal_selesai' => 'required|date|after:tanggal_mulai',
            'source_tahun_id' => 'required|exists:tahun_ajaran,id',
            'copy_kelas' => 'boolean',
            'copy_jadwal' => 'boolean',
            'copy_kegiatan' => 'boolean',
            'copy_kalender' => 'boolean',
            'copy_ekskul' => 'boolean',
            'copy_rapat' => 'boolean',
            'siswa_mappings' => 'array'
        ]);

        DB::beginTransaction();
        try {
            // 1. Create new tahun ajaran
            $newTahun = TahunAjaran::create([
                'nama' => $validated['nama'],
                'tanggal_mulai' => $validated['tanggal_mulai'],
                'tanggal_selesai' => $validated['tanggal_selesai'],
                'is_active' => false
            ]);

            $sourceTahunId = $validated['source_tahun_id'];
            $kelasMapping = []; // old_id => new_id

            // 2. Copy Kelas if selected
            if ($validated['copy_kelas'] ?? true) {
                $sourceKelas = Kelas::where('tahun_ajaran_id', $sourceTahunId)->get();
                foreach ($sourceKelas as $k) {
                    $newKelas = Kelas::create([
                        'nama_kelas' => $k->nama_kelas,
                        'inisial' => $k->inisial,
                        'tingkat' => $k->tingkat,
                        'wali_kelas_id' => $k->wali_kelas_id,
                        'kapasitas' => $k->kapasitas,
                        'status' => 'Aktif',
                        'tahun_ajaran_id' => $newTahun->id
                    ]);
                    $kelasMapping[$k->id] = $newKelas->id;
                }
            }

            // 3. Process siswa mappings - INSERT into pivot table instead of updating siswa
            if (!empty($validated['siswa_mappings'])) {
                foreach ($validated['siswa_mappings'] as $mapping) {
                    $siswa = Siswa::find($mapping['siswa_id']);
                    if (!$siswa)
                        continue;

                    // Get old pivot record and update its status
                    $oldPivot = SiswaKelas::where('siswa_id', $siswa->id)
                        ->where('tahun_ajaran_id', $sourceTahunId)
                        ->first();

                    switch ($mapping['action']) {
                        case 'naik':
                            // Find new kelas for promoted student
                            $newKelasId = $this->findNewKelas($siswa, $mapping['target_kelas_id'] ?? null, $kelasMapping, $newTahun->id);

                            // Update old record status
                            if ($oldPivot) {
                                $oldPivot->update(['status' => 'Naik']);
                            }

                            // Create new pivot record for new tahun ajaran
                            SiswaKelas::create([
                                'siswa_id' => $siswa->id,
                                'kelas_id' => $newKelasId,
                                'tahun_ajaran_id' => $newTahun->id,
                                'status' => 'Aktif'
                            ]);
                            break;

                        case 'tinggal':
                            // Stay in same grade level
                            $newKelasId = $kelasMapping[$siswa->kelas_id] ?? null;

                            // Update old record status
                            if ($oldPivot) {
                                $oldPivot->update(['status' => 'Tinggal']);
                            }

                            // Create new pivot record
                            SiswaKelas::create([
                                'siswa_id' => $siswa->id,
                                'kelas_id' => $newKelasId,
                                'tahun_ajaran_id' => $newTahun->id,
                                'status' => 'Aktif'
                            ]);
                            break;

                        case 'lulus':
                            // Just update old pivot status, no new record
                            if ($oldPivot) {
                                $oldPivot->update(['status' => 'Lulus']);
                            }
                            // Also update siswa status
                            $siswa->update(['status' => 'Alumni']);
                            break;

                        case 'mutasi':
                            // Just update old pivot status, no new record
                            if ($oldPivot) {
                                $oldPivot->update(['status' => 'Mutasi']);
                            }
                            // Also update siswa status
                            $siswa->update(['status' => 'Mutasi']);
                            break;
                    }
                }
            }

            // 4. Copy Jadwal if selected
            if ($validated['copy_jadwal'] ?? true) {
                $sourceJadwal = Jadwal::where('tahun_ajaran_id', $sourceTahunId)->get();
                foreach ($sourceJadwal as $j) {
                    Jadwal::create([
                        'hari' => $j->hari,
                        'kelas_id' => $kelasMapping[$j->kelas_id] ?? null,
                        'mapel_id' => $j->mapel_id,
                        'guru_id' => $j->guru_id,
                        'jam_ke' => $j->jam_ke,
                        'jam_pelajaran_id' => $j->jam_pelajaran_id,
                        'jam_pelajaran_sampai_id' => $j->jam_pelajaran_sampai_id,
                        'tahun_ajaran_id' => $newTahun->id
                    ]);
                }
            }

            // 5. Copy Kegiatan if selected (without attendance)
            if ($validated['copy_kegiatan'] ?? true) {
                $sourceKegiatan = Kegiatan::where('tahun_ajaran_id', $sourceTahunId)->get();
                foreach ($sourceKegiatan as $k) {
                    // Adjust dates +1 year
                    $waktuMulai = $k->waktu_mulai ? \Carbon\Carbon::parse($k->waktu_mulai)->addYear() : null;
                    $waktuBerakhir = $k->waktu_berakhir ? \Carbon\Carbon::parse($k->waktu_berakhir)->addYear() : null;

                    Kegiatan::create([
                        'nama_kegiatan' => $k->nama_kegiatan,
                        'jenis_kegiatan' => $k->jenis_kegiatan,
                        'waktu_mulai' => $waktuMulai,
                        'waktu_berakhir' => $waktuBerakhir,
                        'tempat' => $k->tempat,
                        'penanggung_jawab' => $k->penanggung_jawab,
                        'penanggung_jawab_id' => $k->penanggung_jawab_id,
                        'guru_pendamping' => $k->guru_pendamping,
                        'peserta' => $k->peserta,
                        'kelas_peserta' => $k->kelas_peserta,
                        'deskripsi' => $k->deskripsi,
                        'status' => 'Aktif',
                        'tahun_ajaran_id' => $newTahun->id
                    ]);
                }
            }

            // 6. Copy Kalender if selected
            if ($validated['copy_kalender'] ?? true) {
                $sourceKalender = Kalender::where('tahun_ajaran_id', $sourceTahunId)
                    ->whereNull('kegiatan_id') // Only copy standalone entries
                    ->get();
                foreach ($sourceKalender as $k) {
                    // Adjust dates +1 year
                    $tanggalMulai = $k->tanggal_mulai ? \Carbon\Carbon::parse($k->tanggal_mulai)->addYear() : null;
                    $tanggalBerakhir = $k->tanggal_berakhir ? \Carbon\Carbon::parse($k->tanggal_berakhir)->addYear() : null;

                    Kalender::create([
                        'tanggal_mulai' => $tanggalMulai,
                        'tanggal_berakhir' => $tanggalBerakhir,
                        'kegiatan' => $k->kegiatan,
                        'status_kbm' => $k->status_kbm,
                        'guru_id' => $k->guru_id,
                        'keterangan' => $k->keterangan,
                        'rab' => $k->rab,
                        'tahun_ajaran_id' => $newTahun->id
                    ]);
                }
            }

            // 7. Copy Ekskul if selected (without members)
            if ($validated['copy_ekskul'] ?? true) {
                $sourceEkskul = Ekskul::where('tahun_ajaran_id', $sourceTahunId)->get();
                foreach ($sourceEkskul as $e) {
                    Ekskul::create([
                        'nama_ekskul' => $e->nama_ekskul,
                        'kategori' => $e->kategori,
                        'pembina_id' => $e->pembina_id,
                        'hari' => $e->hari,
                        'jam_mulai' => $e->jam_mulai,
                        'jam_selesai' => $e->jam_selesai,
                        'tempat' => $e->tempat,
                        'deskripsi' => $e->deskripsi,
                        'status' => 'Aktif',
                        'tahun_ajaran_id' => $newTahun->id
                    ]);
                }
            }

            // 8. Copy Rapat if selected (without attendance/results)
            if ($validated['copy_rapat'] ?? true) {
                $sourceRapat = Rapat::where('tahun_ajaran_id', $sourceTahunId)->get();
                foreach ($sourceRapat as $r) {
                    // Adjust date +1 year
                    $tanggal = $r->tanggal ? \Carbon\Carbon::parse($r->tanggal)->addYear() : now()->addYear();

                    Rapat::create([
                        'agenda_rapat' => $r->agenda_rapat ?? $r->agenda ?? 'Rapat',
                        'jenis_rapat' => $r->jenis_rapat ?? 'Rutin',
                        'pimpinan' => $r->pimpinan ?? 'Kepala Sekolah',
                        'sekretaris' => $r->sekretaris ?? 'Sekretaris',
                        'pimpinan_id' => $r->pimpinan_id,
                        'sekretaris_id' => $r->sekretaris_id,
                        'notulis_id' => $r->notulis_id,
                        'tanggal' => $tanggal->format('Y-m-d'),
                        'waktu_mulai' => $r->waktu_mulai ?? '09:00:00',
                        'waktu_selesai' => $r->waktu_selesai ?? '10:00:00',
                        'tempat' => $r->tempat ?? 'Ruang Rapat',
                        'peserta_rapat' => $r->peserta_rapat,
                        'status' => 'Dijadwalkan',
                        'tahun_ajaran_id' => $newTahun->id
                    ]);
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Tahun ajaran baru berhasil dibuat',
                'data' => $newTahun
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Find new kelas for promoted student
     */
    private function findNewKelas($siswa, $targetKelasId, $kelasMapping, $newTahunId)
    {
        // If specific target specified, use it
        if ($targetKelasId) {
            return $targetKelasId;
        }

        // Otherwise, find kelas at next grade level
        $currentKelas = $siswa->kelas;
        if (!$currentKelas)
            return null;

        // Map Roman numerals to integers for calculation
        $romanToInt = ['X' => 10, 'XI' => 11, 'XII' => 12, '10' => 10, '11' => 11, '12' => 12];
        $intToRoman = [10 => 'X', 11 => 'XI', 12 => 'XII'];

        $currentTingkat = $romanToInt[$currentKelas->tingkat] ?? 10;
        $nextTingkat = min($currentTingkat + 1, 12);
        $nextTingkatStr = $intToRoman[$nextTingkat] ?? (string) $nextTingkat;

        // Try to find matching kelas by tingkat (try both formats)
        $newKelas = Kelas::where('tahun_ajaran_id', $newTahunId)
            ->where(function ($q) use ($nextTingkat, $nextTingkatStr) {
                $q->where('tingkat', $nextTingkatStr)
                    ->orWhere('tingkat', (string) $nextTingkat);
            })
            ->first();

        return $newKelas?->id;
    }
}
