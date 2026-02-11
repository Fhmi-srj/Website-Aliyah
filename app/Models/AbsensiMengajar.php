<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AbsensiMengajar extends Model
{
    use HasFactory;

    protected $table = 'absensi_mengajar';

    protected $fillable = [
        'jadwal_id',
        'guru_id',
        'snapshot_kelas',
        'snapshot_mapel',
        'snapshot_jam',
        'snapshot_hari',
        'snapshot_guru_nama',
        'tanggal',
        'ringkasan_materi',
        'berita_acara',
        'status',
        'guru_status',
        'guru_keterangan',
        'guru_tugas_id',
        'siswa_hadir',
        'siswa_sakit',
        'siswa_izin',
        'siswa_alpha',
        'tugas_siswa',
        'absensi_time',
    ];

    protected $casts = [
        'tanggal' => 'date',
        'absensi_time' => 'datetime',
    ];

    /**
     * Get the jadwal for this absensi.
     */
    public function jadwal()
    {
        return $this->belongsTo(Jadwal::class);
    }

    /**
     * Get the guru for this absensi.
     */
    public function guru()
    {
        return $this->belongsTo(Guru::class);
    }

    /**
     * Get the replacement guru (guru tugas) for this absensi.
     */
    public function guruTugas()
    {
        return $this->belongsTo(Guru::class, 'guru_tugas_id');
    }



    /**
     * Get display info - uses snapshot if available, falls back to relation
     */
    public function getDisplayInfo()
    {
        return [
            'kelas' => $this->snapshot_kelas ?? $this->jadwal?->kelas?->nama ?? '-',
            'mapel' => $this->snapshot_mapel ?? $this->jadwal?->mapel?->nama ?? '-',
            'jam' => $this->snapshot_jam ?? $this->jadwal?->jam ?? '-',
            'hari' => $this->snapshot_hari ?? $this->jadwal?->hari ?? '-',
            'guru_nama' => $this->snapshot_guru_nama ?? $this->guru?->nama ?? '-',
        ];
    }
}

