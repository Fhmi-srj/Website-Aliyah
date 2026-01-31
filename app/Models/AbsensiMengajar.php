<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AbsensiMengajar extends Model
{
    use HasFactory;

    protected $table = 'absensi_mengajar';

    protected $fillable = [
        'jadwal_id',
        'guru_id',
        'tanggal',
        'ringkasan_materi',
        'berita_acara',
        'status',
        'guru_status',
        'guru_keterangan',
        'absensi_time',
    ];

    protected $casts = [
        'tanggal' => 'date',
        'absensi_time' => 'datetime',
    ];

    /**
     * Get the jadwal for this absensi.
     */
    public function jadwal()
    {
        return $this->belongsTo(Jadwal::class);
    }

    /**
     * Get the guru for this absensi.
     */
    public function guru()
    {
        return $this->belongsTo(Guru::class);
    }

    /**
     * Get the absensi siswa for this sesi.
     */
    public function absensiSiswa()
    {
        return $this->hasMany(AbsensiSiswa::class);
    }
}
