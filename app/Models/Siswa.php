<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

class Siswa extends Authenticatable
{
    use HasApiTokens, HasFactory;

    protected $table = 'siswa';

    protected $fillable = [
        'nama',
        'status',
        'nis',
        'nisn',
        'password',
        'kelas_id',
        'jenis_kelamin',
        'alamat',
        'tanggal_lahir',
        'tempat_lahir',
        'asal_sekolah',
        'nama_ayah',
        'nama_ibu',
        'kontak_ortu',
        'tahun_ajaran_id',
    ];

    protected $hidden = ['password', 'remember_token'];

    protected $casts = [
        'tanggal_lahir' => 'date',
        'password' => 'hashed',
    ];

    public function tahunAjaran()
    {
        return $this->belongsTo(TahunAjaran::class);
    }

    /**
     * Get the kelas that this siswa belongs to.
     */
    public function kelas()
    {
        return $this->belongsTo(Kelas::class);
    }

    /**
     * Get the class history for this siswa across all academic years.
     */
    public function kelasHistory()
    {
        return $this->hasMany(SiswaKelas::class);
    }

    /**
     * Get the kelas for a specific tahun ajaran.
     */
    public function kelasForTahun($tahunAjaranId)
    {
        return $this->kelasHistory()
            ->where('tahun_ajaran_id', $tahunAjaranId)
            ->with('kelas')
            ->first();
    }

    /**
     * Scope to filter siswa by tahun ajaran via pivot table.
     */
    public function scopeForTahunAjaran($query, $tahunAjaranId)
    {
        return $query->whereHas('kelasHistory', function ($q) use ($tahunAjaranId) {
            $q->where('tahun_ajaran_id', $tahunAjaranId)
                ->whereIn('status', ['Aktif', 'Naik', 'Tinggal']);
        });
    }
}
