<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Kelas extends Model
{
    use HasFactory;

    protected $table = 'kelas';

    protected $fillable = [
        'nama_kelas',
        'inisial',
        'tingkat',
        'wali_kelas_id',
        'kapasitas',
        'status',
        'tahun_ajaran_id',
    ];

    public function tahunAjaran()
    {
        return $this->belongsTo(TahunAjaran::class);
    }

    /**
     * Get the siswa for this kelas (direct relation - legacy).
     */
    public function siswa()
    {
        return $this->hasMany(Siswa::class);
    }

    /**
     * Get siswa through SiswaKelas pivot table for this kelas and tahun_ajaran.
     */
    public function siswaKelas()
    {
        return $this->hasMany(SiswaKelas::class);
    }

    /**
     * Get the jadwal for this kelas.
     */
    public function jadwal()
    {
        return $this->hasMany(Jadwal::class);
    }

    /**
     * Get the wali kelas (guru) for this kelas.
     */
    public function waliKelas()
    {
        return $this->belongsTo(Guru::class, 'wali_kelas_id');
    }

    /**
     * Get jumlah siswa count from SiswaKelas pivot table for same tahun_ajaran.
     */
    public function getJumlahSiswaAttribute()
    {
        return SiswaKelas::where('kelas_id', $this->id)
            ->where('tahun_ajaran_id', $this->tahun_ajaran_id)
            ->whereIn('status', ['Aktif', 'Naik', 'Tinggal'])
            ->count();
    }
}
