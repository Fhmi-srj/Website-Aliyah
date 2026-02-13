<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SuratMasuk extends Model
{
    use HasFactory;

    protected $table = 'surat_masuk';

    protected $fillable = [
        'user_id',
        'tanggal',
        'tanggal_surat',
        'pengirim',
        'perihal',
        'agenda',
        'nomor_surat',
        'keterangan',
        'file_surat',
        'tahun_ajaran_id',
    ];

    protected $casts = [
        'tanggal' => 'date',
        'tanggal_surat' => 'date',
    ];

    /**
     * Get the user (admin) who recorded this letter.
     */
    public function user()
    {
        return $this->belongsTo(\App\Models\User::class);
    }

    /**
     * Get the tahun ajaran.
     */
    public function tahunAjaran()
    {
        return $this->belongsTo(TahunAjaran::class);
    }
}
