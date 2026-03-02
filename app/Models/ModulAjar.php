<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ModulAjar extends Model
{
    use HasFactory;

    protected $table = 'modul_ajar';

    protected $fillable = [
        'guru_id',
        'mapel',
        'kelas',
        'fase',
        'semester',
        'bab_materi',
        'tanggal',
        'alokasi_waktu',
        'tujuan_pembelajaran',
        'profil_pelajar',
        'kegiatan_pendahuluan',
        'kegiatan_inti',
        'kegiatan_penutup',
        'asesmen_formatif',
        'asesmen_sumatif',
        'media_sumber',
        'status',
        'locked_at',
        'duplicated_from',
    ];

    protected $casts = [
        'profil_pelajar' => 'array',
        'locked_at' => 'datetime',
        'semester' => 'integer',
    ];

    // ── Relationships ──

    public function guru()
    {
        return $this->belongsTo(Guru::class);
    }

    public function duplicateSource()
    {
        return $this->belongsTo(self::class, 'duplicated_from');
    }

    // ── Scopes ──

    public function scopeDraft($query)
    {
        return $query->where('status', 'draft');
    }

    public function scopeLocked($query)
    {
        return $query->where('status', 'locked');
    }

    // ── Helpers ──

    public function isLocked(): bool
    {
        return $this->status === 'locked';
    }

    public function isDraft(): bool
    {
        return $this->status === 'draft';
    }
}
