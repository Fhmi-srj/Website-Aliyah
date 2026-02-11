<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Carbon;

class RelinkAbsensiSeeder extends Seeder
{
    /**
     * Re-link all absensi_mengajar to jadwal by strict matching:
     * guru_id + kelas + mapel + hari (from tanggal date).
     * Delete records that don't match any jadwal.
     */
    public function run(): void
    {
        // Kelas name mapping: Excel format -> DB format
        $kelasAliases = [
            'X ( Sepuluh )' => 'X',
            'XI ( Sebelas )' => 'XI',
            'XII ( Duabelas )' => 'XII',
        ];

        // Mapel name mapping: Excel variations -> DB nama_mapel
        $mapelAliases = [
            'B.Inggris' => 'B. Inggris',
            'Bahasa Inggris' => 'B. Inggris',
            'Mencatat Recount text' => 'B. Inggris',
            'Pemanasan di Task 6. Latihan Pronounce the words' => 'B. Inggris',
            'Bahasa Indonesia' => 'B. Indonesia',
            'Bahasa Indobesia' => 'B. Indonesia',
            'Bahasa Indonesis' => 'B. Indonesia',
            'Bahasa Indonexia' => 'B. Indonesia',
            'Bahasa Arab' => 'B. Arab',
            'B. Arab,' => 'B. Arab',
            'Muhadatsah' => 'Muhadasah',
            'Muhadatsab' => 'Muhadasah',
            'B. Arab, Muhadatsah' => 'Muhadasah',
            'Taahfid' => 'Tahfidz',
            'Tahfidh' => 'Tahfidz',
            'tahfidz' => 'Tahfidz',
            'Tajwid _ Makhorijul Huruf' => 'Tajwid',
            'BK' => 'Bimbingan Konseling',
            'Bimbingan konseling' => 'Bimbingan Konseling',
            'bahasa arab peminatan' => 'B. Arab Pem',
        ];

        // Indonesian day names
        $dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

        // Load all jadwal with kelas and mapel names
        $jadwalList = DB::table('jadwal')
            ->join('kelas', 'jadwal.kelas_id', '=', 'kelas.id')
            ->join('mapel', 'jadwal.mapel_id', '=', 'mapel.id')
            ->select('jadwal.id', 'jadwal.guru_id', 'jadwal.hari', 'kelas.nama_kelas', 'mapel.nama_mapel')
            ->get();

        // Build lookup: "guru_id|kelas|mapel|hari" => jadwal_id
        $jadwalLookup = [];
        foreach ($jadwalList as $j) {
            $key = "{$j->guru_id}|{$j->nama_kelas}|{$j->nama_mapel}|{$j->hari}";
            $jadwalLookup[$key] = $j->id;
        }

        $this->command->info("Loaded " . count($jadwalLookup) . " jadwal combinations.");

        // Load ALL absensi_mengajar records
        $allRecords = DB::table('absensi_mengajar')
            ->select('id', 'guru_id', 'snapshot_kelas', 'snapshot_mapel', 'snapshot_hari', 'tanggal', 'jadwal_id')
            ->get();

        $this->command->info("Processing " . $allRecords->count() . " absensi records...");

        $linked = 0;
        $deleted = 0;
        $deleteIds = [];

        foreach ($allRecords as $record) {
            // Get actual day of week from tanggal
            $hari = $dayNames[Carbon::parse($record->tanggal)->dayOfWeek];

            // Resolve kelas
            $kelasShort = $kelasAliases[$record->snapshot_kelas] ?? $record->snapshot_kelas;

            // Resolve mapel
            $mapelName = $mapelAliases[$record->snapshot_mapel] ?? $record->snapshot_mapel;

            // Try to find matching jadwal: guru + kelas + mapel + hari
            $key = "{$record->guru_id}|{$kelasShort}|{$mapelName}|{$hari}";

            if (isset($jadwalLookup[$key])) {
                // Match found - update jadwal_id
                DB::table('absensi_mengajar')
                    ->where('id', $record->id)
                    ->update(['jadwal_id' => $jadwalLookup[$key]]);
                $linked++;
            } else {
                // No match - mark for deletion
                $deleteIds[] = $record->id;
                $deleted++;
            }
        }

        // Delete unmatched records in batches
        if (!empty($deleteIds)) {
            $this->command->warn("Deleting {$deleted} unmatched records...");
            foreach (array_chunk($deleteIds, 100) as $chunk) {
                // Also delete related absensi_siswa
                DB::table('absensi_siswa')->whereIn('absensi_mengajar_id', $chunk)->delete();
                DB::table('absensi_mengajar')->whereIn('id', $chunk)->delete();
            }
        }

        $this->command->info("");
        $this->command->info("✅ Relink complete!");
        $this->command->info("   Linked to jadwal: {$linked}");
        $this->command->info("   Deleted (no match): {$deleted}");
        $this->command->info("   Remaining records: " . DB::table('absensi_mengajar')->count());

        // Show summary of deleted combinations
        if ($deleted > 0) {
            $this->command->warn("");
            $this->command->warn("Deleted records had these unmatched guru+kelas+mapel+hari combos.");
            $this->command->warn("These will show as 'alpha' and guru can re-submit absensi.");
        }
    }
}
