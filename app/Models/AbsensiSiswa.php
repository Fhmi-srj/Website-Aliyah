<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AbsensiSiswa extends Model
{
    use HasFactory;

    protected $table = 'absensi_siswa';

    protected $fillable = [
        'absensi_mengajar_id',
        'siswa_id',
        'status',
        'keterangan',
    ];

    /**
     * Get the absensi mengajar parent.
     */
    public function absensiMengajar()
    {
        return $this->belongsTo(AbsensiMengajar::class);
    }

    /**
     * Get the siswa for this absensi.
     */
    public function siswa()
    {
        return $this->belongsTo(Siswa::class);
    }
}
