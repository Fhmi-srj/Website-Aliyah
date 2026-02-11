<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\AbsensiMengajar;
use Illuminate\Support\Facades\DB;

class PopulateAbsensiSnapshotSeeder extends Seeder
{
    /**
     * Populate snapshot data for existing absensi records.
     */
    public function run(): void
    {
        $absensiWithoutSnapshot = AbsensiMengajar::whereNull('snapshot_kelas')->get();

        $this->command->info("Found {$absensiWithoutSnapshot->count()} absensi records without snapshot");

        $updated = 0;
        foreach ($absensiWithoutSnapshot as $absensi) {
            try {
                $jadwal = $absensi->jadwal;
                $guru = $absensi->guru;

                if ($jadwal && $guru) {
                    $absensi->update([
                        'snapshot_kelas' => $jadwal->kelas?->nama_kelas ?? null,
                        'snapshot_mapel' => $jadwal->mapel?->nama_mapel ?? null,
                        'snapshot_jam' => $jadwal->jam_mulai . ' - ' . $jadwal->jam_selesai,
                        'snapshot_hari' => $jadwal->hari,
                        'snapshot_guru_nama' => $guru->nama,
                    ]);
                    $updated++;
                }
            } catch (\Exception $e) {
                $this->command->error("Error updating absensi #{$absensi->id}: " . $e->getMessage());
            }
        }

        $this->command->info("Updated {$updated} absensi records with snapshot data");
    }
}
