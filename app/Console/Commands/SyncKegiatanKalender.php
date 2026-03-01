<?php

namespace App\Console\Commands;

use App\Models\Kalender;
use App\Models\Kegiatan;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class SyncKegiatanKalender extends Command
{
    protected $signature = 'sync:kegiatan-kalender';
    protected $description = 'Sync orphaned Kalender (type Kegiatan) entries with Kegiatan table and vice versa';

    public function handle()
    {
        $this->info('🔄 Syncing Kegiatan ↔ Kalender...');
        $createdKegiatan = 0;
        $createdKalender = 0;

        DB::beginTransaction();
        try {
            // 1. Kalender type "Kegiatan" without linked kegiatan → create Kegiatan
            $orphanedKalender = Kalender::where('keterangan', 'Kegiatan')
                ->whereNull('kegiatan_id')
                ->get();

            foreach ($orphanedKalender as $kal) {
                $penanggungJawabNama = '-';
                if ($kal->guru_id) {
                    $guru = \App\Models\Guru::find($kal->guru_id);
                    $penanggungJawabNama = $guru ? $guru->nama : '-';
                }

                $kegiatan = Kegiatan::create([
                    'nama_kegiatan' => $kal->kegiatan,
                    'jenis_kegiatan' => 'Rutin',
                    'waktu_mulai' => $kal->tanggal_mulai,
                    'waktu_berakhir' => $kal->tanggal_berakhir ?? $kal->tanggal_mulai,
                    'tempat' => $kal->tempat,
                    'penanggung_jawab_id' => $kal->guru_id,
                    'penanggung_jawab' => $penanggungJawabNama,
                    'status' => 'Aktif',
                    'tahun_ajaran_id' => $kal->tahun_ajaran_id,
                ]);

                $kal->update(['kegiatan_id' => $kegiatan->id]);
                $createdKegiatan++;
                $this->line("  ✅ Kalender #{$kal->id} \"{$kal->kegiatan}\" → Kegiatan #{$kegiatan->id}");
            }

            // 2. Kegiatan without linked Kalender → create Kalender
            $orphanedKegiatan = Kegiatan::whereDoesntHave('kalender')->get();

            foreach ($orphanedKegiatan as $keg) {
                $kalender = Kalender::create([
                    'tanggal_mulai' => $keg->waktu_mulai,
                    'tanggal_berakhir' => $keg->waktu_berakhir,
                    'kegiatan' => $keg->nama_kegiatan,
                    'status_kbm' => 'Aktif',
                    'tempat' => $keg->tempat,
                    'guru_id' => $keg->penanggung_jawab_id,
                    'kegiatan_id' => $keg->id,
                    'keterangan' => 'Kegiatan',
                    'tahun_ajaran_id' => $keg->tahun_ajaran_id,
                ]);

                $createdKalender++;
                $this->line("  ✅ Kegiatan #{$keg->id} \"{$keg->nama_kegiatan}\" → Kalender #{$kalender->id}");
            }

            DB::commit();

            $this->newLine();
            $this->info("✨ Sync selesai!");
            $this->table(
                ['Aksi', 'Jumlah'],
                [
                    ['Kegiatan baru dibuat (dari Kalender orphan)', $createdKegiatan],
                    ['Kalender baru dibuat (dari Kegiatan orphan)', $createdKalender],
                ]
            );

            return 0;
        } catch (\Exception $e) {
            DB::rollBack();
            $this->error("❌ Gagal sync: " . $e->getMessage());
            return 1;
        }
    }
}
