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
        'tahun_ajaran_id',
        'kalender_id',
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
    public function penanggungJawab()
    {
        return $this->belongsTo(Guru::class, 'penanggung_jawab_id');
    }

    /**
     * Get the absensi kegiatan records.
     */
    public function absensiKegiatan()
    {
        return $this->hasMany(AbsensiKegiatan::class, 'kegiatan_id');
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

    /**
     * Get the tahun ajaran for this kegiatan.
     */
    public function tahunAjaran()
    {
        return $this->belongsTo(TahunAjaran::class);
    }

    /**
     * Get the linked kalender entry.
     */
    public function kalender()
    {
        return $this->hasOne(Kalender::class, 'kegiatan_id');
    }
}
