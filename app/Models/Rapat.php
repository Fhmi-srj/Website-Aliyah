<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Rapat extends Model
{
    use HasFactory;

    protected $table = 'rapat';

    protected $fillable = [
        'agenda_rapat',
        'jenis_rapat',
        'pimpinan',
        'sekretaris',
        'pimpinan_id',
        'sekretaris_id',
        'peserta_rapat',
        'notulis_id',
        'tanggal',
        'waktu_mulai',
        'waktu_selesai',
        'tempat',
        'status',
    ];

    protected $casts = [
        'tanggal' => 'date',
        'peserta_rapat' => 'array',
    ];

    /**
     * Get the notulis (guru) for this rapat.
     */
    public function notulis()
    {
        return $this->belongsTo(Guru::class, 'notulis_id');
    }

    /**
     * Get the pimpinan (guru) for this rapat.
     */
    public function pimpinanGuru()
    {
        return $this->belongsTo(Guru::class, 'pimpinan_id');
    }

    /**
     * Get the sekretaris (guru) for this rapat.
     */
    public function sekretarisGuru()
    {
        return $this->belongsTo(Guru::class, 'sekretaris_id');
    }
}

