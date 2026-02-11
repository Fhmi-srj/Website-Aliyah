<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Carbon\Carbon;

class TahunAjaranSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * 
     * Tahun Ajaran (Academic Year) in Indonesian schools:
     * - Runs from July to June (not January to December)
     * - Example: 2025/2026 = July 2025 - June 2026
     */
    public function run(): void
    {
        // Disable foreign key checks and clear existing data
        Schema::disableForeignKeyConstraints();
        DB::table('tahun_ajaran')->truncate();
        Schema::enableForeignKeyConstraints();

        $currentYear = Carbon::now()->year;
        $currentMonth = Carbon::now()->month;

        // Determine current academic year
        // If July or later, current academic year starts this year
        // If before July (Jan-June), we're still in previous year's academic year
        $currentAcademicStartYear = $currentMonth >= 7 ? $currentYear : $currentYear - 1;

        // Create tahun ajaran for multiple years (past, current, and future)
        $tahunAjaranData = [];

        // 2 years before, current year, and 1 year ahead
        for ($i = -2; $i <= 1; $i++) {
            $startYear = $currentAcademicStartYear + $i;
            $endYear = $startYear + 1;

            $tahunAjaranData[] = [
                'nama' => "{$startYear}/{$endYear}",
                'tanggal_mulai' => Carbon::create($startYear, 7, 1)->format('Y-m-d'), // July 1st
                'tanggal_selesai' => Carbon::create($endYear, 6, 30)->format('Y-m-d'), // June 30th
                'is_active' => ($i === 0), // Current year is active
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        DB::table('tahun_ajaran')->insert($tahunAjaranData);

        $this->command->info('TahunAjaranSeeder: ' . count($tahunAjaranData) . ' tahun ajaran created.');

        // Display which is active
        $active = collect($tahunAjaranData)->firstWhere('is_active', true);
        $this->command->info("Active Tahun Ajaran: {$active['nama']} ({$active['tanggal_mulai']} to {$active['tanggal_selesai']})");
    }
}
