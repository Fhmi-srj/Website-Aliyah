<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Kalender extends Model
{
    use HasFactory;

    protected $table = 'kalender';

    protected $fillable = [
        'tanggal_mulai',
        'tanggal_berakhir',
        'kegiatan',
        'tempat',
        'status_kbm',
        'guru_id',
        'kegiatan_id',
        'keterangan',
        'rab',
        'tahun_ajaran_id',
    ];

    protected $casts = [
        'tanggal_mulai' => 'datetime',
        'tanggal_berakhir' => 'datetime',
        'rab' => 'decimal:2',
    ];

    public function tahunAjaran()
    {
        return $this->belongsTo(TahunAjaran::class);
    }

    /**
     * Get the guru (penanggung jawab) for this kalender event.
     */
    public function guru()
    {
        return $this->belongsTo(Guru::class, 'guru_id');
    }

    /**
     * Get the linked kegiatan.
     */
    public function kegiatanRef()
    {
        return $this->belongsTo(Kegiatan::class, 'kegiatan_id');
    }
}

