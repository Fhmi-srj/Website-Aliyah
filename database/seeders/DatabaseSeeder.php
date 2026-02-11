<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Call all seeders in order (dependencies first)
        $this->call([
            TahunAjaranSeeder::class, // Must be first (academic year data)
            KelasSeeder::class,
            MapelSeeder::class,
            GuruSeeder::class,
            SiswaSeeder::class,
            JadwalSeeder::class,
            KegiatanSeeder::class,
            EkstrakurikulerSeeder::class,
            RapatSeeder::class,
            UserSeeder::class, // Must be after GuruSeeder
            HistoricalDataSeeder::class, // Generate historical data for 2024/2025
        ]);
    }
}

