<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Supervisi extends Model
{
    protected $table = 'supervisi';

    protected $fillable = [
        'supervisor_id',
        'guru_id',
        'mapel_id',
        'kelas',
        'topik',
        'tanggal',
        'catatan',
        'hasil_supervisi',
        'dokumentasi',
        'status',
        'tahun_ajaran_id',
    ];

    protected $casts = [
        'tanggal' => 'date',
        'hasil_supervisi' => 'array',
        'dokumentasi' => 'array',
    ];

    public function supervisor()
    {
        return $this->belongsTo(Guru::class, 'supervisor_id');
    }

    public function guru()
    {
        return $this->belongsTo(Guru::class, 'guru_id');
    }

    public function mapel()
    {
        return $this->belongsTo(Mapel::class);
    }

    public function tahunAjaran()
    {
        return $this->belongsTo(TahunAjaran::class);
    }
}
