<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AttendanceToken extends Model
{
    use HasFactory;

    protected $fillable = [
        'guru_id',
        'token',
        'type',
        'reference_id',
        'tanggal',
        'expires_at',
        'used_at',
    ];

    protected $casts = [
        'tanggal' => 'date',
        'expires_at' => 'datetime',
        'used_at' => 'datetime',
    ];

    /**
     * Check if the token is still valid (not expired and not used)
     */
    public function isValid(): bool
    {
        return !$this->used_at && $this->expires_at->isFuture();
    }

    /**
     * Mark the token as used
     */
    public function markUsed(): void
    {
        $this->update(['used_at' => now()]);
    }

    /**
     * Get the guru
     */
    public function guru()
    {
        return $this->belongsTo(Guru::class);
    }

    /**
     * Get the referenced model (jadwal/kegiatan/rapat)
     */
    public function getReference()
    {
        return match ($this->type) {
            'mengajar' => Jadwal::with(['mapel', 'kelas'])->find($this->reference_id),
            'kegiatan' => Kegiatan::find($this->reference_id),
            'rapat' => Rapat::find($this->reference_id),
            default => null,
        };
    }

    /**
     * Generate a unique token
     */
    public static function generateToken(): string
    {
        do {
            $token = bin2hex(random_bytes(32));
        } while (self::where('token', $token)->exists());

        return $token;
    }
}
