<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Siswa extends Model
{
    use HasFactory;

    protected $table = 'siswa';

    protected $fillable = [
        'nama',
        'status',
        'nis',
        'nisn',
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

    protected $casts = [
        'tanggal_lahir' => 'date',
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
