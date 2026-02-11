<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Ekskul extends Model
{
    use HasFactory;

    protected $table = 'ekskul';

    protected $fillable = [
        'nama_ekskul',
        'kategori',
        'pembina_id',
        'hari',
        'jam_mulai',
        'jam_selesai',
        'tempat',
        'deskripsi',
        'status',
        'tahun_ajaran_id',
    ];

    public function tahunAjaran()
    {
        return $this->belongsTo(TahunAjaran::class);
    }

    /**
     * Get the pembina (guru) for this ekskul.
     */
    public function pembina()
    {
        return $this->belongsTo(Guru::class, 'pembina_id');
    }

    /**
     * Get the siswa members for this ekskul.
     */
    public function anggota()
    {
        return $this->belongsToMany(Siswa::class, 'siswa_ekskul', 'ekskul_id', 'siswa_id')
            ->withPivot('tanggal_daftar', 'status')
            ->withTimestamps();
    }

    /**
     * Get active members count.
     */
    public function getJumlahAnggotaAttribute()
    {
        return $this->anggota()->count();
    }
}
