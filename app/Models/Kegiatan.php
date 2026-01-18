<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Kegiatan extends Model
{
    use HasFactory;

    protected $table = 'kegiatan';

    protected $fillable = [
        'nama_kegiatan',
        'jenis_kegiatan',
        'waktu_mulai',
        'waktu_berakhir',
        'tempat',
        'penanggung_jawab_id',
        'penanggung_jawab', // Keep for backward compatibility
        'guru_pendamping',
        'peserta',
        'kelas_peserta',
        'deskripsi',
        'status',
        'status_kbm', // Keep for backward compatibility
    ];

    protected $casts = [
        'waktu_mulai' => 'datetime',
        'waktu_berakhir' => 'datetime',
        'guru_pendamping' => 'array',
        'kelas_peserta' => 'array',
    ];

    /**
     * Get the penanggung jawab (guru) for this kegiatan.
     */
    public function penanggungjawab()
    {
        return $this->belongsTo(Guru::class, 'penanggung_jawab_id');
    }

    /**
     * Get guru pendamping list.
     */
    public function guruPendampingList()
    {
        if (empty($this->guru_pendamping)) {
            return collect([]);
        }
        return Guru::whereIn('id', $this->guru_pendamping)->get();
    }

    /**
     * Get kelas peserta list.
     */
    public function kelasPesertaList()
    {
        if (empty($this->kelas_peserta)) {
            return collect([]);
        }
        return Kelas::whereIn('id', $this->kelas_peserta)->get();
    }
}
