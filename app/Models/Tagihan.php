<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Tagihan extends Model
{
    protected $table = 'tagihan';

    protected $fillable = [
        'nama',
        'tahun_ajaran_id',
        'tanggal_jatuh_tempo',
    ];

    protected $casts = [
        'tanggal_jatuh_tempo' => 'date',
    ];

    public function tahunAjaran()
    {
        return $this->belongsTo(TahunAjaran::class);
    }

    public function tagihanSiswa()
    {
        return $this->hasMany(TagihanSiswa::class);
    }
}
