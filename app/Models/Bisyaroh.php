<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Bisyaroh extends Model
{
    use HasFactory;

    protected $table = 'bisyaroh';

    protected $fillable = [
        'guru_id',
        'bulan',
        'tahun',
        'jumlah_jam',
        'jumlah_hadir',
        'gaji_pokok',
        'tunj_struktural',
        'tunj_transport',
        'tunj_masa_kerja',
        'tunj_kegiatan',
        'tunj_rapat',
        'jumlah',
        'potongan_detail',
        'jumlah_potongan',
        'total_penerimaan',
        'detail_kegiatan',
        'detail_rapat',
        'detail_mengajar',
        'status',
    ];

    protected $casts = [
        'potongan_detail' => 'array',
        'detail_kegiatan' => 'array',
        'detail_rapat' => 'array',
        'detail_mengajar' => 'array',
    ];

    /**
     * Get the guru for this bisyaroh.
     */
    public function guru()
    {
        return $this->belongsTo(Guru::class);
    }
}
