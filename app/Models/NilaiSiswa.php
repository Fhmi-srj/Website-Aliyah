<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class NilaiSiswa extends Model
{
    use HasFactory;

    protected $table = 'nilai_siswa';

    protected $fillable = [
        'absensi_mengajar_id',
        'siswa_id',
        'nilai',
        'keterangan',
    ];

    protected $casts = [
        'nilai' => 'decimal:2',
    ];

    public function absensiMengajar()
    {
        return $this->belongsTo(AbsensiMengajar::class);
    }

    public function siswa()
    {
        return $this->belongsTo(Siswa::class);
    }
}
