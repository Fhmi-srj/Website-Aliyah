<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Bisyaroh;
use App\Models\BisyarohSetting;
use App\Models\Guru;
use App\Models\Jadwal;
use App\Models\AbsensiMengajar;
use App\Models\AbsensiKegiatan;
use App\Models\AbsensiRapat;
use App\Models\Kegiatan;
use App\Models\Rapat;
use Carbon\Carbon;
use Illuminate\Http\Request;

class BisyarohController extends Controller
{
    /**
     * Get all bisyaroh settings grouped by category
     */
    public function getSettings()
    {
        $settings = BisyarohSetting::orderBy('category')
            ->orderBy('sort_order')
            ->get()
            ->map(function ($item) {
                $item->value = $item->type === 'integer' ? (int) $item->value : $item->value;
                return $item;
            })
            ->groupBy('category');

        return response()->json([
            'success' => true,
            'data' => $settings,
        ]);
    }

    /**
     * Update bisyaroh settings (bulk)
     */
    public function updateSettings(Request $request)
    {
        $request->validate([
            'settings' => 'required|array',
            'settings.*.key' => 'required|string',
            'settings.*.value' => 'required',
        ]);

        foreach ($request->settings as $item) {
            BisyarohSetting::where('key', $item['key'])->update([
                'value' => (string) $item['value'],
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Pengaturan bisyaroh berhasil diperbarui',
        ]);
    }

    /**
     * Add a new bisyaroh setting
     */
    public function addSetting(Request $request)
    {
        $request->validate([
            'key' => 'required|string|unique:bisyaroh_settings,key',
            'value' => 'required',
            'type' => 'required|in:integer,string,boolean',
            'category' => 'required|string',
            'label' => 'required|string',
        ]);

        $maxSort = BisyarohSetting::where('category', $request->category)->max('sort_order') ?? 0;

        $setting = BisyarohSetting::create([
            'key' => $request->key,
            'value' => (string) $request->value,
            'type' => $request->type,
            'category' => $request->category,
            'label' => $request->label,
            'sort_order' => $maxSort + 1,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Setting berhasil ditambahkan',
            'data' => $setting,
        ]);
    }

    /**
     * Delete a bisyaroh setting
     */
    public function deleteSetting($id)
    {
        $setting = BisyarohSetting::findOrFail($id);
        $setting->delete();

        return response()->json([
            'success' => true,
            'message' => 'Setting berhasil dihapus',
        ]);
    }

    /**
     * Get bisyaroh list for a given month/year
     */
    public function index(Request $request)
    {
        $bulan = $request->input('bulan', now()->month);
        $tahun = $request->input('tahun', now()->year);

        // Only show bisyaroh for aktif guru
        $aktifGuruIds = Guru::where('status', 'aktif')->pluck('id');

        $bisyaroh = Bisyaroh::with('guru.user.roles')
            ->where('bulan', $bulan)
            ->where('tahun', $tahun)
            ->whereIn('guru_id', $aktifGuruIds)
            ->get()
            ->map(function ($item) {
                // Get jabatan from user roles
                $jabatan = '-';
                if ($item->guru && $item->guru->user) {
                    $roleNames = $item->guru->user->roles
                        ->where('name', '!=', 'guru')
                        ->pluck('display_name')
                        ->toArray();
                    $jabatan = !empty($roleNames) ? implode(', ', $roleNames) : 'Guru';
                }
                return [
                    'id' => $item->id,
                    'guru_id' => $item->guru_id,
                    'nama' => $item->guru->nama ?? '-',
                    'jabatan' => $jabatan,
                    'jumlah_jam' => $item->jumlah_jam,
                    'jumlah_hadir' => $item->jumlah_hadir,
                    'gaji_pokok' => $item->gaji_pokok,
                    'tunj_struktural' => $item->tunj_struktural,
                    'tunj_transport' => $item->tunj_transport,
                    'tunj_masa_kerja' => $item->tunj_masa_kerja,
                    'tunj_kegiatan' => $item->tunj_kegiatan,
                    'tunj_rapat' => $item->tunj_rapat,
                    'jumlah' => $item->jumlah,
                    'potongan_detail' => $item->potongan_detail,
                    'jumlah_potongan' => $item->jumlah_potongan,
                    'total_penerimaan' => $item->total_penerimaan,
                    'status' => $item->status,
                ];
            });

        // Get settings for display
        $settings = [
            'bisyaroh_per_jam' => BisyarohSetting::getValue('bisyaroh_per_jam', 30000),
            'transport_per_hadir' => BisyarohSetting::getValue('transport_per_hadir', 7500),
        ];

        return response()->json([
            'success' => true,
            'data' => $bisyaroh,
            'settings' => $settings,
            'bulan' => (int) $bulan,
            'tahun' => (int) $tahun,
        ]);
    }

    /**
     * Get detail for a single bisyaroh record
     */
    public function show($id)
    {
        $bisyaroh = Bisyaroh::with('guru.user.roles')->findOrFail($id);

        // Get jabatan from user roles
        $jabatan = '-';
        if ($bisyaroh->guru && $bisyaroh->guru->user) {
            $roleNames = $bisyaroh->guru->user->roles
                ->where('name', '!=', 'guru')
                ->pluck('display_name')
                ->toArray();
            $jabatan = !empty($roleNames) ? implode(', ', $roleNames) : 'Guru';
        }

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $bisyaroh->id,
                'guru' => [
                    'id' => $bisyaroh->guru->id,
                    'nama' => $bisyaroh->guru->nama,
                    'jabatan' => $jabatan,
                    'nip' => $bisyaroh->guru->nip,
                    'tmt' => $bisyaroh->guru->tmt,
                ],
                'bulan' => $bisyaroh->bulan,
                'tahun' => $bisyaroh->tahun,
                'jumlah_jam' => $bisyaroh->jumlah_jam,
                'jumlah_hadir' => $bisyaroh->jumlah_hadir,
                'gaji_pokok' => $bisyaroh->gaji_pokok,
                'tunj_struktural' => $bisyaroh->tunj_struktural,
                'tunj_transport' => $bisyaroh->tunj_transport,
                'tunj_masa_kerja' => $bisyaroh->tunj_masa_kerja,
                'tunj_kegiatan' => $bisyaroh->tunj_kegiatan,
                'tunj_rapat' => $bisyaroh->tunj_rapat,
                'jumlah' => $bisyaroh->jumlah,
                'potongan_detail' => $bisyaroh->potongan_detail,
                'jumlah_potongan' => $bisyaroh->jumlah_potongan,
                'total_penerimaan' => $bisyaroh->total_penerimaan,
                'detail_kegiatan' => $bisyaroh->detail_kegiatan,
                'detail_rapat' => $bisyaroh->detail_rapat,
                'detail_mengajar' => $bisyaroh->detail_mengajar,
                'status' => $bisyaroh->status,
            ],
        ]);
    }

    /**
     * Generate bisyaroh for all guru in a given month/year
     */
    public function generate(Request $request)
    {
        $request->validate([
            'bulan' => 'required|integer|between:1,12',
            'tahun' => 'required|integer|min:2020',
        ]);

        $bulan = $request->bulan;
        $tahun = $request->tahun;

        // Load all settings
        $settings = BisyarohSetting::all()->pluck('value', 'key')->map(function ($v, $k) {
            $setting = BisyarohSetting::where('key', $k)->first();
            return $setting && $setting->type === 'integer' ? (int) $v : $v;
        });

        $bisyarohPerJam = $settings['bisyaroh_per_jam'] ?? 30000;
        $transportPerHadir = $settings['transport_per_hadir'] ?? 7500;
        $tunjMasaKerjaPerTahun = $settings['tunjangan_masa_kerja_per_tahun'] ?? 5000;

        // Jabatan mapping: jabatan value => setting key
        $jabatanMap = [
            'Kepala Madrasah' => 'tunj_kepala_madrasah',
            'Tata Administrasi I' => 'tunj_tata_administrasi_i',
            'Tata Administrasi II' => 'tunj_tata_administrasi_ii',
            'Tata Administrasi' => 'tunj_tata_administrasi_i',
            'Waka Kurikulum' => 'tunj_waka_kurikulum',
            'Wakur' => 'tunj_waka_kurikulum',
            'Waka Kesiswaan' => 'tunj_waka_kesiswaan',
            'Wali Kelas' => 'tunj_wali_kelas',
            'Walas' => 'tunj_wali_kelas',
            'Proktor ANBK' => 'tunj_proktor_anbk',
            'Teknisi ANBK' => 'tunj_teknisi_anbk',
        ];

        $tunjKoordinatorKegiatan = $settings['tunj_koordinator_kegiatan'] ?? 0;
        $tunjPendampingKegiatan = $settings['tunj_pendamping_kegiatan'] ?? 0;
        $tunjRapat = $settings['tunj_rapat'] ?? 0;

        // Potongan settings
        $potonganSettings = BisyarohSetting::where('category', 'potongan')
            ->orderBy('sort_order')
            ->get();

        // Get start/end of month
        $startDate = Carbon::createFromDate($tahun, $bulan, 1)->startOfMonth();
        $endDate = $startDate->copy()->endOfMonth();

        // Get all active guru
        $guruList = Guru::where('status', 'aktif')->with('user.roles')->get();

        // Delete bisyaroh for non-aktif guru (cleanup stale records)
        $aktifGuruIds = $guruList->pluck('id');
        Bisyaroh::where('bulan', $bulan)
            ->where('tahun', $tahun)
            ->whereNotIn('guru_id', $aktifGuruIds)
            ->delete();

        $generated = [];

        foreach ($guruList as $guru) {
            // Collect all unique "hadir" dates across mengajar, kegiatan, rapat
            $hariHadirSet = [];

            // === 1. Teaching attendance ===
            $absensiMengajar = AbsensiMengajar::where('guru_id', $guru->id)
                ->whereBetween('tanggal', [$startDate, $endDate])
                ->get();

            // Jumlah jam = total jam pelajaran per minggu (parse jam_ke ranges like "7-8" = 2 hours)
            $jadwalEntries = $guru->jadwal()->get();
            $jumlahJam = 0;
            foreach ($jadwalEntries as $jEntry) {
                $jamKe = $jEntry->jam_ke;
                if (str_contains($jamKe, '-')) {
                    $parts = explode('-', $jamKe);
                    $start = (int) $parts[0];
                    $end = (int) $parts[1];
                    $jumlahJam += ($end - $start + 1);
                } else {
                    $jumlahJam += 1;
                }
            }

            // Collect mengajar hadir dates
            $mengajarHadir = $absensiMengajar->where('guru_status', 'H');
            foreach ($mengajarHadir as $mh) {
                $hariHadirSet[$mh->tanggal->format('Y-m-d')] = true;
            }

            // Detail mengajar log
            $detailMengajar = $absensiMengajar->map(function ($a) {
                $info = $a->getDisplayInfo();
                return [
                    'tanggal' => $a->tanggal->format('Y-m-d'),
                    'hari' => $info['hari'],
                    'jam' => $info['jam'],
                    'mapel' => $info['mapel'],
                    'kelas' => $info['kelas'],
                    'guru_status' => $a->guru_status,
                ];
            })->values()->toArray();

            // === 2. Calculate gaji pokok (FIXED: jam per minggu × tarif) ===
            $gajiPokok = $jumlahJam * $bisyarohPerJam;

            // === 3. Tunjangan struktural (based on user roles) ===
            $tunjStruktural = 0;
            $matchedJabatan = []; // track to avoid double-counting aliases

            // Map role names to jabatan names for matching
            $roleToJabatan = [
                'kepala_madrasah' => 'Kepala Madrasah',
                'waka_kurikulum' => 'Waka Kurikulum',
                'waka_kesiswaan' => 'Waka Kesiswaan',
                'wali_kelas' => 'Wali Kelas',
                'tata_usaha' => 'Tata Administrasi',
            ];

            if ($guru->user) {
                $guruRoles = $guru->user->roles->pluck('name')->toArray();
                foreach ($guruRoles as $roleName) {
                    $jabatanName = $roleToJabatan[$roleName] ?? null;
                    if ($jabatanName && isset($jabatanMap[$jabatanName])) {
                        $settingKey = $jabatanMap[$jabatanName];
                        if (!in_array($settingKey, $matchedJabatan)) {
                            $tunjStruktural += $settings[$settingKey] ?? 0;
                            $matchedJabatan[] = $settingKey;
                        }
                    }
                }
            }

            // Also check guru.jabatan field as fallback for extra jabatan like Proktor ANBK
            $guruJabatan = $guru->jabatan ?? '';
            if ($guruJabatan) {
                foreach ($jabatanMap as $jabatanName => $settingKey) {
                    if (in_array($settingKey, $matchedJabatan))
                        continue;
                    if (stripos($guruJabatan, $jabatanName) !== false) {
                        $tunjStruktural += $settings[$settingKey] ?? 0;
                        $matchedJabatan[] = $settingKey;
                    }
                }
            }

            // === 4. Tunjangan transport ===
            // Transport will be calculated after kehadiran is finalized (below)
            $tunjTransport = 0; // placeholder, computed after kegiatan/rapat

            // === 5. Tunjangan masa kerja (max 5 tahun) ===
            $tunjMasaKerja = 0;
            if ($guru->tmt) {
                $tmtDate = Carbon::parse($guru->tmt);
                $tahunMasaKerja = min(5, max(0, (int) $tmtDate->diffInYears($startDate, false)));
                $tunjMasaKerja = $tahunMasaKerja * $tunjMasaKerjaPerTahun;
            }

            // === 6. Tunjangan kegiatan ===
            $tunjKegiatanTotal = 0;
            $detailKegiatan = [];

            // Kegiatan in this month — include ALL, even if guru not assigned
            $kegiatanBulanIni = Kegiatan::whereBetween('waktu_mulai', [$startDate, $endDate])->get();

            foreach ($kegiatanBulanIni as $kegiatan) {
                $isPJ = $kegiatan->penanggung_jawab_id == $guru->id;
                $isPendamping = in_array($guru->id, $kegiatan->guru_pendamping ?? []);

                $hadirCount = 0;
                $totalSesi = 0;
                $peran = '-';
                $tunjKegiatanItem = 0;

                if ($isPJ || $isPendamping) {
                    // Check attendance from AbsensiKegiatan
                    $absensiKeg = AbsensiKegiatan::where('kegiatan_id', $kegiatan->id)
                        ->whereBetween('tanggal', [$startDate, $endDate])
                        ->get();

                    $totalSesi = $absensiKeg->count();

                    foreach ($absensiKeg as $ak) {
                        if ($isPJ) {
                            if ($ak->pj_status === 'H') {
                                $hadirCount++;
                                $hariHadirSet[$ak->tanggal->format('Y-m-d')] = true;
                            }
                        } elseif ($isPendamping) {
                            $pendampingList = $ak->absensi_pendamping ?? [];
                            foreach ($pendampingList as $p) {
                                if (($p['guru_id'] ?? null) == $guru->id && ($p['status'] ?? '') === 'H') {
                                    $hadirCount++;
                                    $hariHadirSet[$ak->tanggal->format('Y-m-d')] = true;
                                    break;
                                }
                            }
                        }
                    }

                    $peran = $isPJ ? 'Koordinator' : 'Pendamping';
                    $tunjanganPerHadir = $isPJ ? $tunjKoordinatorKegiatan : $tunjPendampingKegiatan;
                    $tunjKegiatanItem = $hadirCount * $tunjanganPerHadir;
                    $tunjKegiatanTotal += $tunjKegiatanItem;
                }

                $detailKegiatan[] = [
                    'kegiatan_id' => $kegiatan->id,
                    'nama' => $kegiatan->nama_kegiatan,
                    'tanggal' => $kegiatan->waktu_mulai?->format('Y-m-d'),
                    'peran' => $peran,
                    'hadir' => $hadirCount,
                    'total_sesi' => $totalSesi,
                    'tunjangan' => $tunjKegiatanItem,
                ];
            }

            // === 7. Tunjangan rapat ===
            $tunjRapatTotal = 0;
            $detailRapatArr = [];

            $rapatBulanIni = Rapat::whereBetween('tanggal', [$startDate, $endDate])->get();

            foreach ($rapatBulanIni as $rapat) {
                $isPeserta = in_array($guru->id, $rapat->peserta_rapat ?? []);
                $isPimpinan = $rapat->pimpinan_id == $guru->id;
                $isSekretaris = $rapat->sekretaris_id == $guru->id;

                if (!$isPeserta && !$isPimpinan && !$isSekretaris)
                    continue;

                // Check attendance
                $absensiRpt = AbsensiRapat::where('rapat_id', $rapat->id)->first();
                $hadir = false;

                if ($absensiRpt) {
                    if ($isPimpinan) {
                        $hadir = $absensiRpt->pimpinan_status === 'H';
                    } elseif ($isSekretaris) {
                        $hadir = $absensiRpt->sekretaris_status === 'H';
                    } else {
                        // Check peserta array
                        $pesertaAbsensi = $absensiRpt->absensi_peserta ?? [];
                        foreach ($pesertaAbsensi as $p) {
                            if (($p['guru_id'] ?? null) == $guru->id && ($p['status'] ?? '') === 'H') {
                                $hadir = true;
                                break;
                            }
                        }
                    }
                }

                if ($hadir) {
                    $tunjRapatTotal += $tunjRapat;
                    // Count rapat day as hadir
                    if ($rapat->tanggal) {
                        $hariHadirSet[$rapat->tanggal->format('Y-m-d')] = true;
                    }
                }

                $detailRapatArr[] = [
                    'rapat_id' => $rapat->id,
                    'agenda' => $rapat->agenda_rapat,
                    'tanggal' => $rapat->tanggal?->format('Y-m-d'),
                    'tempat' => $rapat->tempat,
                    'hadir' => $hadir,
                    'tunjangan' => $hadir ? $tunjRapat : 0,
                ];
            }

            // === 8. Finalize kehadiran & transport ===
            $jumlahHadir = count($hariHadirSet);
            $tunjTransport = $jumlahHadir * $transportPerHadir;

            // === 9. Calculate totals ===
            $jumlah = $gajiPokok + $tunjStruktural + $tunjTransport + $tunjMasaKerja + $tunjKegiatanTotal + $tunjRapatTotal;

            // === 10. Potongan ===
            $potonganDetail = [];
            $jumlahPotongan = 0;
            foreach ($potonganSettings as $pot) {
                $val = (int) $pot->value;
                $potonganDetail[$pot->label] = $val;
                $jumlahPotongan += $val;
            }

            $totalPenerimaan = $jumlah - $jumlahPotongan;

            // === 11. Save/Update bisyaroh record ===
            $bisyaroh = Bisyaroh::updateOrCreate(
                ['guru_id' => $guru->id, 'bulan' => $bulan, 'tahun' => $tahun],
                [
                    'jumlah_jam' => $jumlahJam,
                    'jumlah_hadir' => $jumlahHadir,
                    'gaji_pokok' => $gajiPokok,
                    'tunj_struktural' => $tunjStruktural,
                    'tunj_transport' => $tunjTransport,
                    'tunj_masa_kerja' => $tunjMasaKerja,
                    'tunj_kegiatan' => $tunjKegiatanTotal,
                    'tunj_rapat' => $tunjRapatTotal,
                    'jumlah' => $jumlah,
                    'potongan_detail' => $potonganDetail,
                    'jumlah_potongan' => $jumlahPotongan,
                    'total_penerimaan' => $totalPenerimaan,
                    'detail_kegiatan' => $detailKegiatan,
                    'detail_rapat' => $detailRapatArr,
                    'detail_mengajar' => $detailMengajar,
                    'status' => 'draft',
                ]
            );

            $generated[] = $bisyaroh->id;
        }

        return response()->json([
            'success' => true,
            'message' => 'Bisyaroh berhasil di-generate untuk ' . count($generated) . ' guru/pegawai',
            'count' => count($generated),
        ]);
    }

    /**
     * Delete bisyaroh records for a month
     */
    public function destroy(Request $request)
    {
        $request->validate([
            'bulan' => 'required|integer|between:1,12',
            'tahun' => 'required|integer|min:2020',
        ]);

        $deleted = Bisyaroh::where('bulan', $request->bulan)
            ->where('tahun', $request->tahun)
            ->delete();

        return response()->json([
            'success' => true,
            'message' => $deleted . ' record bisyaroh berhasil dihapus',
        ]);
    }

    /**
     * Print rekap bisyaroh (all guru) - returns Blade view
     */
    public function printRekap(Request $request)
    {
        $bulan = $request->input('bulan', now()->month);
        $tahun = $request->input('tahun', now()->year);

        // Only include aktif guru
        $aktifGuruIds = Guru::where('status', 'aktif')->pluck('id');

        $bisyaroh = Bisyaroh::with('guru.user.roles')
            ->where('bulan', $bulan)
            ->where('tahun', $tahun)
            ->whereIn('guru_id', $aktifGuruIds)
            ->get();

        $settings = [
            'bisyaroh_per_jam' => BisyarohSetting::getValue('bisyaroh_per_jam', 30000),
            'transport_per_hadir' => BisyarohSetting::getValue('transport_per_hadir', 7500),
        ];

        $bulanNama = Carbon::createFromDate($tahun, $bulan, 1)->translatedFormat('F');
        $kopUrl = \App\Services\PrintService::getKopUrl();
        $kepala = \App\Services\PrintService::getKepalaSekolah();
        $namaLembaga = \App\Models\AppSetting::getValue('nama_lembaga', 'MA ALHIKAM');

        // Get logo as base64 for slip embeds
        $logoBase64 = null;
        $logoPath = \App\Models\AppSetting::getValue('logo_lembaga');
        if ($logoPath) {
            $fullPath = storage_path('app/public/' . $logoPath);
            if (file_exists($fullPath)) {
                $mime = mime_content_type($fullPath);
                $logoBase64 = 'data:' . $mime . ';base64,' . base64_encode(file_get_contents($fullPath));
            }
        }

        return view('print.bisyaroh-rekap', compact('bisyaroh', 'settings', 'bulan', 'tahun', 'bulanNama', 'kopUrl', 'kepala', 'namaLembaga', 'logoBase64'));
    }

    /**
     * Print rincian bisyaroh (single guru)
     */
    public function printRincian($id)
    {
        $bisyaroh = Bisyaroh::with('guru')->findOrFail($id);

        $bulanNama = Carbon::createFromDate($bisyaroh->tahun, $bisyaroh->bulan, 1)->translatedFormat('F');

        return view('print.bisyaroh-rincian', compact('bisyaroh', 'bulanNama'));
    }

    /**
     * List all kegiatan in a given month
     */
    public function kegiatanBulan(Request $request)
    {
        $request->validate([
            'bulan' => 'required|integer|between:1,12',
            'tahun' => 'required|integer|min:2020',
        ]);

        $startDate = Carbon::createFromDate($request->tahun, $request->bulan, 1)->startOfMonth();
        $endDate = $startDate->copy()->endOfMonth();

        $kegiatan = Kegiatan::whereBetween('waktu_mulai', [$startDate, $endDate])
            ->orderBy('waktu_mulai')
            ->get()
            ->map(function ($k) {
                $pj = $k->penanggung_jawab_id ? Guru::find($k->penanggung_jawab_id) : null;
                $gpIds = $k->guru_pendamping ?? [];
                $gpNames = Guru::whereIn('id', $gpIds)->pluck('nama')->toArray();

                return [
                    'id' => $k->id,
                    'nama' => $k->nama_kegiatan,
                    'jenis' => $k->jenis_kegiatan,
                    'tanggal' => $k->waktu_mulai?->format('Y-m-d'),
                    'waktu_mulai' => $k->waktu_mulai?->format('H:i'),
                    'waktu_berakhir' => $k->waktu_berakhir?->format('H:i'),
                    'tempat' => $k->tempat,
                    'pj' => $pj?->nama ?? '-',
                    'guru_pendamping' => $gpNames,
                    'has_absensi' => $k->has_absensi,
                ];
            });

        return response()->json(['success' => true, 'data' => $kegiatan]);
    }

    /**
     * List all rapat in a given month
     */
    public function rapatBulan(Request $request)
    {
        $request->validate([
            'bulan' => 'required|integer|between:1,12',
            'tahun' => 'required|integer|min:2020',
        ]);

        $startDate = Carbon::createFromDate($request->tahun, $request->bulan, 1)->startOfMonth();
        $endDate = $startDate->copy()->endOfMonth();

        $rapat = Rapat::whereBetween('tanggal', [$startDate, $endDate])
            ->orderBy('tanggal')
            ->get()
            ->map(function ($r) {
                $pimpinan = $r->pimpinan_id ? Guru::find($r->pimpinan_id) : null;
                $sekretaris = $r->sekretaris_id ? Guru::find($r->sekretaris_id) : null;
                $pesertaIds = $r->peserta_rapat ?? [];
                $pesertaCount = count($pesertaIds);

                return [
                    'id' => $r->id,
                    'agenda' => $r->agenda_rapat,
                    'tanggal' => $r->tanggal?->format('Y-m-d'),
                    'tempat' => $r->tempat,
                    'pimpinan' => $pimpinan?->nama ?? '-',
                    'sekretaris' => $sekretaris?->nama ?? '-',
                    'jumlah_peserta' => $pesertaCount,
                ];
            });

        return response()->json(['success' => true, 'data' => $rapat]);
    }

    // ==================== HISTORY / RIWAYAT ====================

    /**
     * Save current bisyaroh data as a history snapshot.
     */
    public function saveHistory(Request $request)
    {
        $request->validate([
            'bulan' => 'required|integer|between:1,12',
            'tahun' => 'required|integer|min:2020',
            'label' => 'nullable|string|max:255',
            'notes' => 'nullable|string|max:1000',
        ]);

        $bulan = $request->input('bulan');
        $tahun = $request->input('tahun');

        // Get current bisyaroh data for this period
        $aktifGuruIds = Guru::where('status', 'aktif')->pluck('id');
        $bisyaroh = Bisyaroh::with('guru.user.roles')
            ->where('bulan', $bulan)
            ->where('tahun', $tahun)
            ->whereIn('guru_id', $aktifGuruIds)
            ->get();

        if ($bisyaroh->isEmpty()) {
            return response()->json([
                'success' => false,
                'message' => 'Tidak ada data bisyaroh untuk periode ini. Generate terlebih dahulu.',
            ], 422);
        }

        // Build snapshot data
        $snapshotData = $bisyaroh->map(function ($b) {
            $jabatan = '-';
            if ($b->guru && $b->guru->user) {
                $roleNames = $b->guru->user->roles->where('name', '!=', 'guru')->pluck('display_name')->toArray();
                $jabatan = !empty($roleNames) ? implode(', ', $roleNames) : 'Guru';
            }

            return [
                'guru_id' => $b->guru_id,
                'nama' => $b->guru->nama ?? '-',
                'jabatan' => $jabatan,
                'jumlah_jam' => $b->jumlah_jam,
                'jumlah_hadir' => $b->jumlah_hadir,
                'gaji_pokok' => $b->gaji_pokok,
                'tunj_struktural' => $b->tunj_struktural,
                'tunj_transport' => $b->tunj_transport,
                'tunj_masa_kerja' => $b->tunj_masa_kerja,
                'tunj_kegiatan' => $b->tunj_kegiatan,
                'tunj_rapat' => $b->tunj_rapat,
                'jumlah' => $b->jumlah,
                'potongan_detail' => $b->potongan_detail,
                'jumlah_potongan' => $b->jumlah_potongan,
                'total_penerimaan' => $b->total_penerimaan,
                'detail_kegiatan' => $b->detail_kegiatan,
                'detail_rapat' => $b->detail_rapat,
            ];
        })->toArray();

        $totalJumlah = $bisyaroh->sum('jumlah');
        $totalPenerimaan = $bisyaroh->sum('total_penerimaan');
        $bulanNama = Carbon::createFromDate($tahun, $bulan, 1)->translatedFormat('F');

        $history = \App\Models\BisyarohHistory::create([
            'bulan' => $bulan,
            'tahun' => $tahun,
            'label' => $request->input('label', "Bisyaroh {$bulanNama} {$tahun}"),
            'data' => $snapshotData,
            'total_guru' => count($snapshotData),
            'total_jumlah' => $totalJumlah,
            'total_penerimaan' => $totalPenerimaan,
            'status' => 'draft',
            'notes' => $request->input('notes'),
            'created_by' => auth()->id(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Riwayat berhasil disimpan.',
            'data' => $history->load('creator'),
        ]);
    }

    /**
     * Get list of all history snapshots.
     */
    public function getHistories(Request $request)
    {
        $query = \App\Models\BisyarohHistory::with('creator:id,name', 'locker:id,name')
            ->orderBy('created_at', 'desc');

        if ($request->filled('bulan')) {
            $query->where('bulan', $request->input('bulan'));
        }
        if ($request->filled('tahun')) {
            $query->where('tahun', $request->input('tahun'));
        }

        $histories = $query->get()->map(function ($h) {
            return [
                'id' => $h->id,
                'bulan' => $h->bulan,
                'tahun' => $h->tahun,
                'label' => $h->label,
                'total_guru' => $h->total_guru,
                'total_jumlah' => $h->total_jumlah,
                'total_penerimaan' => $h->total_penerimaan,
                'status' => $h->status,
                'notes' => $h->notes,
                'created_by_name' => $h->creator->name ?? '-',
                'locked_by_name' => $h->locker->name ?? null,
                'locked_at' => $h->locked_at?->format('d/m/Y H:i'),
                'created_at' => $h->created_at->format('d/m/Y H:i'),
            ];
        });

        return response()->json(['success' => true, 'data' => $histories]);
    }

    /**
     * Show a single history snapshot with full data.
     */
    public function showHistory($id)
    {
        $history = \App\Models\BisyarohHistory::with('creator:id,name', 'locker:id,name')
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $history,
        ]);
    }

    /**
     * Toggle lock/unlock a history snapshot.
     */
    public function lockHistory(Request $request, $id)
    {
        $history = \App\Models\BisyarohHistory::findOrFail($id);

        if ($history->status === 'locked') {
            // Unlock
            $history->update([
                'status' => 'draft',
                'locked_by' => null,
                'locked_at' => null,
            ]);
            $message = 'Riwayat berhasil di-unlock.';
        } else {
            // Lock
            $history->update([
                'status' => 'locked',
                'locked_by' => auth()->id(),
                'locked_at' => now(),
            ]);
            $message = 'Riwayat berhasil dikunci.';
        }

        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => $history->fresh()->load('creator:id,name', 'locker:id,name'),
        ]);
    }

    /**
     * Delete a history snapshot (only if draft).
     */
    public function deleteHistory($id)
    {
        $history = \App\Models\BisyarohHistory::findOrFail($id);

        if ($history->status === 'locked') {
            return response()->json([
                'success' => false,
                'message' => 'Tidak bisa menghapus riwayat yang sudah dikunci. Unlock terlebih dahulu.',
            ], 422);
        }

        $history->delete();

        return response()->json([
            'success' => true,
            'message' => 'Riwayat berhasil dihapus.',
        ]);
    }
}
