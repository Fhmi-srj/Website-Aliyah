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
        'peserta_eksternal',
        'notulis_id',
        'tanggal',
        'waktu_mulai',
        'waktu_selesai',
        'tempat',
        'status',
        'tahun_ajaran_id',
    ];

    protected $casts = [
        'tanggal' => 'date',
        'peserta_rapat' => 'array',
        'peserta_eksternal' => 'array',
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

    /**
     * Alias for pimpinanGuru
     */
    public function pimpinan()
    {
        return $this->belongsTo(Guru::class, 'pimpinan_id');
    }

    /**
     * Alias for sekretarisGuru
     */
    public function sekretaris()
    {
        return $this->belongsTo(Guru::class, 'sekretaris_id');
    }

    /**
     * Get the absensi records for this rapat.
     */
    public function absensiRapat()
    {
        return $this->hasMany(AbsensiRapat::class, 'rapat_id');
    }

    /**
     * Get the tahun ajaran for this rapat.
     */
    public function tahunAjaran()
    {
        return $this->belongsTo(TahunAjaran::class);
    }
}
