<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\KegiatanRutin;
use App\Models\Kegiatan;
use App\Models\Kalender;
use App\Models\Guru;
use App\Models\Kelas;
use App\Models\TahunAjaran;
use App\Models\AbsensiKegiatan;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class KegiatanRutinController extends Controller
{
    private function getActiveTahunAjaranId(Request $request): ?int
    {
        $user = $request->user();
        if ($user && $user->tahun_ajaran_id) {
            return $user->tahun_ajaran_id;
        }
        $current = TahunAjaran::getCurrent();
        return $current ? $current->id : null;
    }

    public function index(Request $request): JsonResponse
    {
        $tahunAjaranId = $request->query('tahun_ajaran_id') ?? $this->getActiveTahunAjaranId($request);

        $query = KegiatanRutin::with(['penanggungJawab:id,nama', 'tahunAjaran:id,nama'])
            ->withCount('kegiatan');

        if ($tahunAjaranId) {
            $query->where('tahun_ajaran_id', $tahunAjaranId);
        }

        $rutins = $query->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($item) {
                // Add guru pendamping names
                $guruPendampingNames = [];
                if (!empty($item->guru_pendamping)) {
                    $guruPendampingNames = Guru::whereIn('id', $item->guru_pendamping)
                        ->pluck('nama')
                        ->toArray();
                }
                $item->guru_pendamping_names = $guruPendampingNames;

                // Add kelas peserta names
                $kelasPesertaNames = [];
                if (!empty($item->kelas_peserta)) {
                    $kelasPesertaNames = Kelas::whereIn('id', $item->kelas_peserta)
                        ->pluck('nama_kelas')
                        ->toArray();
                }
                $item->kelas_peserta_names = $kelasPesertaNames;

                return $item;
            });

        return response()->json([
            'success' => true,
            'data' => $rutins
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        try {
            // Parse inputs cleanly
            if ($request->has('guru_pendamping') && is_array($request->guru_pendamping)) {
                $gpIds = array_filter(array_map('intval', $request->guru_pendamping), fn($v) => $v > 0);
                $validGpIds = Guru::whereIn('id', $gpIds)->pluck('id')->toArray();
                $request->merge(['guru_pendamping' => array_values($validGpIds)]);
            }
            if ($request->has('kelas_peserta') && is_array($request->kelas_peserta)) {
                $kpIds = array_filter(array_map('intval', $request->kelas_peserta), fn($v) => $v > 0);
                $validKpIds = Kelas::whereIn('id', $kpIds)->pluck('id')->toArray();
                $request->merge(['kelas_peserta' => array_values($validKpIds)]);
            }

            $validated = $request->validate([
                'nama_kegiatan' => 'required|string|max:200',
                'jenis_kegiatan' => 'required|string',
                'hari' => 'nullable|in:Senin,Selasa,Rabu,Kamis,Jumat,Sabtu,Minggu',
                'jam_mulai' => 'required|date_format:H:i',
                'jam_selesai' => 'nullable|date_format:H:i',
                'tempat' => 'nullable|string|max:100',
                'penanggung_jawab_id' => 'nullable|exists:guru,id',
                'guru_pendamping' => 'nullable|array',
                'guru_pendamping.*' => 'integer',
                'kelas_peserta' => 'nullable|array',
                'kelas_peserta.*' => 'integer',
                'peserta' => 'nullable|string|max:100',
                'deskripsi' => 'nullable|string|max:500',
                'status' => 'nullable|in:Aktif,Tidak Aktif',
            ]);

            DB::beginTransaction();

            $validated['tahun_ajaran_id'] = $this->getActiveTahunAjaranId($request);
                        $validated['status'] = $validated['status'] ?? 'Aktif';

            // Generate peserta text from kelas names
            if (!empty($validated['kelas_peserta'])) {
                $kelasNames = Kelas::whereIn('id', $validated['kelas_peserta'])->pluck('nama_kelas')->toArray();
                $validated['peserta'] = implode(', ', $kelasNames);
            }

            $rutin = KegiatanRutin::create($validated);

            $this->generateInstances($rutin, false);

            DB::commit();

            $rutin->load('penanggungJawab:id,nama');

            return response()->json([
                'success' => true,
                'message' => 'Kegiatan Rutin berhasil ditambahkan dan jadwal telah dirangkai otomatis.',
                'data' => $rutin
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            DB::rollBack();
            $firstError = collect($e->errors())->flatten()->first();
            return response()->json([
                'success' => false,
                'message' => $firstError ?? 'Validasi gagal'
            ], 422);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function show(KegiatanRutin $kegiatan_rutin): JsonResponse
    {
        $kegiatan_rutin->load('penanggungJawab:id,nama');
        return response()->json([
            'success' => true,
            'data' => $kegiatan_rutin
        ]);
    }

    public function update(Request $request, KegiatanRutin $kegiatan_rutin): JsonResponse
    {
        try {
            if ($request->has('guru_pendamping') && is_array($request->guru_pendamping)) {
                $gpIds = array_filter(array_map('intval', $request->guru_pendamping), fn($v) => $v > 0);
                $validGpIds = Guru::whereIn('id', $gpIds)->pluck('id')->toArray();
                $request->merge(['guru_pendamping' => array_values($validGpIds)]);
            }
            if ($request->has('kelas_peserta') && is_array($request->kelas_peserta)) {
                $kpIds = array_filter(array_map('intval', $request->kelas_peserta), fn($v) => $v > 0);
                $validKpIds = Kelas::whereIn('id', $kpIds)->pluck('id')->toArray();
                $request->merge(['kelas_peserta' => array_values($validKpIds)]);
            }

            $validated = $request->validate([
                'nama_kegiatan' => 'required|string|max:200',
                'jenis_kegiatan' => 'required|string',
                'hari' => 'nullable|in:Senin,Selasa,Rabu,Kamis,Jumat,Sabtu,Minggu',
                'jam_mulai' => 'required|date_format:H:i',
                'jam_selesai' => 'nullable|date_format:H:i',
                'tempat' => 'nullable|string|max:100',
                'penanggung_jawab_id' => 'nullable|exists:guru,id',
                'guru_pendamping' => 'nullable|array',
                'guru_pendamping.*' => 'integer',
                'kelas_peserta' => 'nullable|array',
                'kelas_peserta.*' => 'integer',
                'peserta' => 'nullable|string|max:100',
                'deskripsi' => 'nullable|string|max:500',
                'status' => 'nullable|in:Aktif,Tidak Aktif',
            ]);

            DB::beginTransaction();

            if (!empty($validated['kelas_peserta'])) {
                $kelasNames = Kelas::whereIn('id', $validated['kelas_peserta'])->pluck('nama_kelas')->toArray();
                $validated['peserta'] = implode(', ', $kelasNames);
            }

            $kegiatan_rutin->update($validated);

            $this->generateInstances($kegiatan_rutin, true);

            DB::commit();

            $kegiatan_rutin->load('penanggungJawab:id,nama');

            return response()->json([
                'success' => true,
                'message' => 'Kegiatan Rutin berhasil diperbarui.',
                'data' => $kegiatan_rutin
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            DB::rollBack();
            $firstError = collect($e->errors())->flatten()->first();
            return response()->json([
                'success' => false,
                'message' => $firstError ?? 'Validasi gagal'
            ], 422);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function destroy(Request $request, KegiatanRutin $kegiatan_rutin): JsonResponse
    {
        DB::beginTransaction();
        try {
            // Count absensi from any child kegiatan
            $kegiatanIds = Kegiatan::where('kegiatan_rutin_id', $kegiatan_rutin->id)->pluck('id');
            $absensiCount = AbsensiKegiatan::whereIn('kegiatan_id', $kegiatanIds)->count();

            if ($absensiCount > 0 && !$request->boolean('force')) {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'message' => "Jadwal Rutin ini memiliki {$absensiCount} data absensi historis yang akan ikut terhapus. Gunakan opsi \"Hapus Paksa\" untuk membersihkan keseluruhan.",
                    'requires_force' => true,
                    'related_counts' => ['absensi_kegiatan' => $absensiCount],
                ], 409);
            }

            // cascadeOnDelete is configured, but we ensure Kalender is also cleaned up
            Kalender::whereIn('kegiatan_id', $kegiatanIds)->delete();
            $kegiatan_rutin->delete(); // automatically deletes child $kegiatan

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Kegiatan Rutin beserta seluruh jadwalnya berhasil dihapus'
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function bulkDelete(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'exists:kegiatan_rutins,id',
            'force' => 'sometimes|boolean',
        ]);

        DB::beginTransaction();
        try {
            $kegiatanIds = Kegiatan::whereIn('kegiatan_rutin_id', $validated['ids'])->pluck('id');
            $absensiCount = AbsensiKegiatan::whereIn('kegiatan_id', $kegiatanIds)->count();

            if ($absensiCount > 0 && !$request->boolean('force')) {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'message' => "Jadwal Rutin ini memiliki {$absensiCount} data absensi historis yang akan ikut terhapus. Gunakan opsi \"Hapus Paksa\" untuk membersihkan keseluruhan.",
                    'requires_force' => true,
                    'related_counts' => ['absensi_kegiatan' => $absensiCount],
                ], 409);
            }

            Kalender::whereIn('kegiatan_id', $kegiatanIds)->delete();
            KegiatanRutin::whereIn('id', $validated['ids'])->delete();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => count($validated['ids']) . ' Kegiatan Rutin berhasil dihapus'
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    private function generateInstances(KegiatanRutin $rutin, bool $isUpdate = false)
    {
        if ($isUpdate) {
            // Delete future unattended instances
            $futureUnattendedKegiatanIds = Kegiatan::where('kegiatan_rutin_id', $rutin->id)
                ->whereDate('waktu_mulai', '>=', Carbon::today())
                ->whereDoesntHave('absensiKegiatan', function ($query) {
                    $query->where('status', 'submitted');
                })
                ->pluck('id');
                
            Kalender::whereIn('kegiatan_id', $futureUnattendedKegiatanIds)->delete();
            Kegiatan::whereIn('id', $futureUnattendedKegiatanIds)->delete();
            
            // Also we should update future ALREADY ATTENDED instances to reflect basic info (name, coordinator) just in case?
            // Actually it's safer to leave attended instances alone or just update them without dates changing.
        }

        $tahunAjaran = TahunAjaran::find($rutin->tahun_ajaran_id) ?? TahunAjaran::getCurrent();
        if (!$tahunAjaran) return;

        $startDate = Carbon::today()->max(Carbon::parse($tahunAjaran->tanggal_mulai));
        $endDate = Carbon::parse($tahunAjaran->tanggal_selesai);

        $daysMap = [
            'Senin' => Carbon::MONDAY,
            'Selasa' => Carbon::TUESDAY,
            'Rabu' => Carbon::WEDNESDAY,
            'Kamis' => Carbon::THURSDAY,
            'Jumat' => Carbon::FRIDAY,
            'Sabtu' => Carbon::SATURDAY,
            'Minggu' => Carbon::SUNDAY,
        ];
        $isHarian = $rutin->jenis_kegiatan === 'Harian';
        $isBulanan = $rutin->jenis_kegiatan === 'Bulanan';

        $currentDate = $startDate->copy();
        if (!$isHarian) {
            $targetDay = $daysMap[$rutin->hari] ?? Carbon::MONDAY;
            $currentDate = $startDate->copy()->next($targetDay);
            if ($startDate->dayOfWeek == $targetDay) {
                $currentDate = $startDate->copy();
            }
        }

        // Get all holidays
        $holidays = Kalender::where('status_kbm', 'Libur')
            ->whereBetween('tanggal_mulai', [$startDate->format('Y-m-d'), $endDate->format('Y-m-d')])
            ->get();
            
        // Pre-fetch actual guru name
        $guruNama = $rutin->penanggungJawab?->nama ?? '-';

        while ($currentDate->lte($endDate)) {
            if ($currentDate->lt(Carbon::today())) {
                if ($isHarian) {
                    $currentDate->addDay();
                } elseif ($isBulanan) {
                    $currentDate->addWeeks(4);
                } else {
                    $currentDate->addWeek();
                }
                continue;
            }
            
            $dateStr = $currentDate->format('Y-m-d');
            
            // Check holiday collision
            $isHoliday = $holidays->contains(function ($holiday) use ($dateStr) {
                return Carbon::parse($holiday->tanggal_mulai)->format('Y-m-d') <= $dateStr &&
                       Carbon::parse($holiday->tanggal_berakhir)->format('Y-m-d') >= $dateStr;
            });

            if (!$isHoliday) {
                // Check if instance already exists on this day
                $exists = Kegiatan::where('kegiatan_rutin_id', $rutin->id)
                    ->whereDate('waktu_mulai', $dateStr)
                    ->exists();

                if (!$exists) {
                    $jamSelesai = $rutin->jam_selesai ?? $rutin->jam_mulai;
                    
                    $kegiatan = Kegiatan::create([
                        'nama_kegiatan' => $rutin->nama_kegiatan,
                        'jenis_kegiatan' => 'Rutin',
                        'waktu_mulai' => $dateStr . ' ' . $rutin->jam_mulai,
                        'waktu_berakhir' => $dateStr . ' ' . $jamSelesai,
                        'tempat' => $rutin->tempat,
                        'penanggung_jawab_id' => $rutin->penanggung_jawab_id,
                        'penanggung_jawab' => $guruNama,
                        'guru_pendamping' => $rutin->guru_pendamping,
                        'kelas_peserta' => $rutin->kelas_peserta,
                        'peserta' => $rutin->peserta,
                        'deskripsi' => $rutin->deskripsi,
                        'status' => 'Aktif',
                        'tahun_ajaran_id' => $rutin->tahun_ajaran_id ?? $tahunAjaran->id,
                        'kegiatan_rutin_id' => $rutin->id,
                    ]);

                    Kalender::create([
                        'tanggal_mulai' => $kegiatan->waktu_mulai,
                        'tanggal_berakhir' => $kegiatan->waktu_berakhir,
                        'kegiatan' => $kegiatan->nama_kegiatan,
                        'status_kbm' => 'Aktif',
                        'tempat' => $kegiatan->tempat,
                        'guru_id' => $kegiatan->penanggung_jawab_id,
                        'kegiatan_id' => $kegiatan->id,
                        'keterangan' => 'Kegiatan',
                        'tahun_ajaran_id' => $kegiatan->tahun_ajaran_id,
                    ]);
                }
            }

            if ($isHarian) {
                $currentDate->addDay();
            } elseif ($isBulanan) {
                $currentDate->addWeeks(4);
            } else {
                $currentDate->addWeek();
            }
        }
    }
}
