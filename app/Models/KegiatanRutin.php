<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class KegiatanRutin extends Model
{
    use HasFactory;

    protected $table = 'kegiatan_rutins';

    protected $fillable = [
        'nama_kegiatan',
        'jenis_kegiatan',
        'hari',
        'jam_mulai',
        'jam_selesai',
        'tempat',
        'penanggung_jawab_id',
        'guru_pendamping',
        'peserta',
        'kelas_peserta',
        'deskripsi',
        'status',
        'tahun_ajaran_id',
    ];

    protected $casts = [
        'penanggung_jawab_id' => 'integer',
        'tahun_ajaran_id' => 'integer',
        'guru_pendamping' => 'array',
        'peserta' => 'array',
        'kelas_peserta' => 'array',
    ];

    public function penanggungJawab()
    {
        return $this->belongsTo(Guru::class, 'penanggung_jawab_id');
    }

    public function tahunAjaran()
    {
        return $this->belongsTo(TahunAjaran::class);
    }

    public function kegiatan()
    {
        return $this->hasMany(Kegiatan::class, 'kegiatan_rutin_id');
    }

    public function guruPendampingList()
    {
        if (empty($this->guru_pendamping)) {
            return collect([]);
        }
        return Guru::whereIn('id', $this->guru_pendamping)->get();
    }

    public function kelasPesertaList()
    {
        if (empty($this->kelas_peserta)) {
            return collect([]);
        }
        return Kelas::whereIn('id', $this->kelas_peserta)->get();
    }
}
