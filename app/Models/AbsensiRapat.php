<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AbsensiRapat extends Model
{
    use HasFactory;

    protected $table = 'absensi_rapat';

    protected $fillable = [
        'rapat_id',
        'tanggal',
        'pimpinan_status',
        'pimpinan_keterangan',
        'pimpinan_self_attended',
        'pimpinan_attended_at',
        'sekretaris_status',
        'sekretaris_keterangan',
        'absensi_peserta',
        'notulensi',
        'foto_rapat',
        'status',
    ];

    protected $casts = [
        'tanggal' => 'date',
        'absensi_peserta' => 'array',
        'foto_rapat' => 'array',
        'pimpinan_self_attended' => 'boolean',
        'pimpinan_attended_at' => 'datetime',
    ];

    /**
     * Get the rapat.
     */
    public function rapat()
    {
        return $this->belongsTo(Rapat::class);
    }
}
