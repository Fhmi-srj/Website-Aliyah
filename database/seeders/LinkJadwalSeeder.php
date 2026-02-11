<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class LinkJadwalSeeder extends Seeder
{
    /**
     * Link existing jadwal records to imported absensi_mengajar
     * where guru + kelas + mapel + hari match.
     */
    public function run(): void
    {
        // Build kelas name map: "X ( Sepuluh )" => kelas_id
        $kelasMap = DB::table('kelas')->pluck('id', 'nama_kelas')->toArray();

        // Excel kelas names -> DB kelas short names
        $kelasAliases = [
            'X ( Sepuluh )' => 'X',
            'XI ( Sebelas )' => 'XI',
            'XII ( Duabelas )' => 'XII',
        ];

        // Build mapel name map with aliases for typos/variations in Excel
        $mapelDb = DB::table('mapel')->pluck('id', 'nama_mapel')->toArray();
        $mapelAliases = [
            // B. Inggris variations
            'B.Inggris' => 'B. Inggris',
            'Bahasa Inggris' => 'B. Inggris',
            'Mencatat Recount text' => 'B. Inggris',
            'Pemanasan di Task 6. Latihan Pronounce the words' => 'B. Inggris',
            // B. Indonesia variations
            'Bahasa Indonesia' => 'B. Indonesia',
            'Bahasa Indobesia' => 'B. Indonesia',
            'Bahasa Indonesis' => 'B. Indonesia',
            'Bahasa Indonexia' => 'B. Indonesia',
            // B. Arab variations
            'Bahasa Arab' => 'B. Arab',
            'B. Arab,' => 'B. Arab',
            // Muhadasah variations (DB has "Muhadasah")
            'Muhadatsah' => 'Muhadasah',
            'Muhadatsab' => 'Muhadasah',
            'B. Arab, Muhadatsah' => 'Muhadasah',
            // Tahfidz variations
            'Taahfid' => 'Tahfidz',
            'Tahfidh' => 'Tahfidz',
            'tahfidz' => 'Tahfidz',
            // Tajwid variations
            'Tajwid _ Makhorijul Huruf' => 'Tajwid',
            // BK variations (DB has "Bimbingan Konseling")
            'BK' => 'Bimbingan Konseling',
            'Bimbingan konseling' => 'Bimbingan Konseling',
            // B. Arab Pem
            'bahasa arab peminatan' => 'B. Arab Pem',
        ];

        // Load all jadwal with relations
        $jadwalList = DB::table('jadwal')
            ->join('kelas', 'jadwal.kelas_id', '=', 'kelas.id')
            ->join('mapel', 'jadwal.mapel_id', '=', 'mapel.id')
            ->select('jadwal.id', 'jadwal.guru_id', 'jadwal.hari', 'kelas.nama_kelas', 'mapel.nama_mapel')
            ->get();

        // Build lookup: "guru_id|kelas_nama|mapel_nama|hari" => jadwal_id
        $jadwalLookup = [];
        foreach ($jadwalList as $j) {
            $key = "{$j->guru_id}|{$j->nama_kelas}|{$j->nama_mapel}|{$j->hari}";
            $jadwalLookup[$key] = $j->id;
        }

        $this->command->info("Loaded " . count($jadwalLookup) . " jadwal combinations.");

        // Process all absensi_mengajar with null jadwal_id
        $absensiRecords = DB::table('absensi_mengajar')
            ->whereNull('jadwal_id')
            ->select('id', 'guru_id', 'snapshot_kelas', 'snapshot_mapel', 'snapshot_hari')
            ->get();

        $this->command->info("Processing " . $absensiRecords->count() . " absensi records...");

        $linked = 0;
        $notFound = 0;

        foreach ($absensiRecords as $record) {
            // Resolve kelas name
            $kelasShort = $kelasAliases[$record->snapshot_kelas] ?? $record->snapshot_kelas;

            // Resolve mapel name
            $mapelName = $mapelAliases[$record->snapshot_mapel] ?? $record->snapshot_mapel;

            // Build lookup key
            $key = "{$record->guru_id}|{$kelasShort}|{$mapelName}|{$record->snapshot_hari}";

            if (isset($jadwalLookup[$key])) {
                DB::table('absensi_mengajar')
                    ->where('id', $record->id)
                    ->update(['jadwal_id' => $jadwalLookup[$key]]);
                $linked++;
            } else {
                $notFound++;
            }
        }

        $this->command->info("✅ Linking complete! {$linked} records linked, {$notFound} not matched.");

        // Show unmatched summary
        if ($notFound > 0) {
            $unmatched = DB::table('absensi_mengajar')
                ->whereNull('jadwal_id')
                ->select('snapshot_guru_nama', 'snapshot_kelas', 'snapshot_mapel')
                ->distinct()
                ->get();

            $this->command->warn("Unmatched combinations:");
            foreach ($unmatched as $u) {
                $this->command->warn("  {$u->snapshot_guru_nama} | {$u->snapshot_kelas} | {$u->snapshot_mapel}");
            }
        }
    }
}
