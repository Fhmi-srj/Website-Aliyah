<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class TahunAjaran extends Model
{
    use HasFactory;

    protected $table = 'tahun_ajaran';

    protected $fillable = [
        'nama',
        'tanggal_mulai',
        'tanggal_selesai',
        'is_active',
    ];

    protected $casts = [
        'tanggal_mulai' => 'date',
        'tanggal_selesai' => 'date',
        'is_active' => 'boolean',
    ];

    /**
     * Get the currently active tahun ajaran.
     */
    public static function getActive()
    {
        return self::where('is_active', true)->first();
    }

    /**
     * Get current tahun ajaran based on today's date.
     */
    public static function getCurrent()
    {
        $today = Carbon::today();
        return self::where('tanggal_mulai', '<=', $today)
            ->where('tanggal_selesai', '>=', $today)
            ->first();
    }

    /**
     * Generate tahun ajaran name from a given year.
     * Academic year runs from July to June.
     * e.g., July 2025 - June 2026 = "2025/2026"
     */
    public static function generateName(int $startYear): string
    {
        return $startYear . '/' . ($startYear + 1);
    }

    /**
     * Auto-generate tahun ajaran if needed.
     * Called on app boot or via scheduled task.
     */
    public static function autoGenerate(): ?self
    {
        $today = Carbon::today();
        $currentMonth = $today->month;
        $currentYear = $today->year;

        // Determine the academic year start
        // If July or later, start year is current year
        // If before July (Jan-June), start year is previous year
        $startYear = $currentMonth >= 7 ? $currentYear : $currentYear - 1;

        $nama = self::generateName($startYear);

        // Check if this tahun ajaran already exists
        $existing = self::where('nama', $nama)->first();
        if ($existing) {
            return null;
        }

        // Create new tahun ajaran (July - June)
        $tahunAjaran = self::create([
            'nama' => $nama,
            'tanggal_mulai' => Carbon::create($startYear, 7, 1),
            'tanggal_selesai' => Carbon::create($startYear + 1, 6, 30),
            'is_active' => false,
        ]);

        // If no active tahun ajaran, make this one active
        if (!self::where('is_active', true)->exists()) {
            $tahunAjaran->update(['is_active' => true]);
        }

        return $tahunAjaran;
    }

    /**
     * Set this tahun ajaran as active.
     */
    public function setAsActive(): void
    {
        // Deactivate all others
        self::where('is_active', true)->update(['is_active' => false]);

        // Activate this one
        $this->update(['is_active' => true]);
    }
}
