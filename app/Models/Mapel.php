<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Mapel extends Model
{
    use HasFactory;

    protected $table = 'mapel';

    protected $fillable = [
        'nama_mapel',
        'keterangan',
        'inisial',
        'kode_mapel',
        'tingkat',
        'guru_pengampu_id',
        'kkm',
        'status',
        'is_non_akademik',
    ];

    protected $casts = [
        'is_non_akademik' => 'boolean',
    ];

    /**
     * Get the guru pengampu for this mapel.
     */
    public function guruPengampu()
    {
        return $this->belongsTo(Guru::class, 'guru_pengampu_id');
    }

    /**
     * Get the jadwal for this mapel.
     */
    public function jadwal()
    {
        return $this->hasMany(Jadwal::class);
    }
}
