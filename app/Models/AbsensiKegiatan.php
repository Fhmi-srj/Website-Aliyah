<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AbsensiKegiatan extends Model
{
    use HasFactory;

    protected $table = 'absensi_kegiatan';

    protected $fillable = [
        'kegiatan_id',
        'tanggal',
        'penanggung_jawab_id',
        'pj_status',
        'pj_keterangan',
        'absensi_pendamping',
        'absensi_siswa',
        'berita_acara',
        'foto_kegiatan',
        'status',
    ];

    protected $casts = [
        'tanggal' => 'date',
        'absensi_pendamping' => 'array',
        'absensi_siswa' => 'array',
        'foto_kegiatan' => 'array',
    ];

    /**
     * Get the kegiatan.
     */
    public function kegiatan()
    {
        return $this->belongsTo(Kegiatan::class);
    }

    /**
     * Get the penanggung jawab (guru).
     */
    public function penanggungjawab()
    {
        return $this->belongsTo(Guru::class, 'penanggung_jawab_id');
    }
}
