<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Jadwal extends Model
{
    use HasFactory;

    protected $table = 'jadwal';

    protected $fillable = [
        'jam_ke',
        'jam_mulai',
        'jam_selesai',
        'jam_pelajaran_id',
        'jam_pelajaran_sampai_id',
        'guru_id',
        'mapel_id',
        'kelas_id',
        'hari',
        'semester',
        'tahun_ajaran',
        'tahun_ajaran_id',
        'status',
    ];

    /**
     * Get the guru for this jadwal.
     */
    public function guru()
    {
        return $this->belongsTo(Guru::class);
    }

    /**
     * Get the mapel for this jadwal.
     */
    public function mapel()
    {
        return $this->belongsTo(Mapel::class);
    }

    /**
     * Get the kelas for this jadwal.
     */
    public function kelas()
    {
        return $this->belongsTo(Kelas::class);
    }

    /**
     * Get the tahun ajaran for this jadwal.
     */
    public function tahunAjaran()
    {
        return $this->belongsTo(TahunAjaran::class);
    }

    /**
     * Get the jam pelajaran (start) for this jadwal.
     */
    public function jamPelajaran()
    {
        return $this->belongsTo(JamPelajaran::class);
    }

    /**
     * Get the jam pelajaran sampai (end) for this jadwal.
     */
    public function jamPelajaranSampai()
    {
        return $this->belongsTo(JamPelajaran::class, 'jam_pelajaran_sampai_id');
    }
}
