<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TagihanSiswa extends Model
{
    protected $table = 'tagihan_siswa';

    protected $fillable = [
        'siswa_id',
        'kelas_id',
        'tagihan_id',
        'nominal',
    ];

    protected $appends = ['total_dibayar', 'status'];

    public function siswa()
    {
        return $this->belongsTo(Siswa::class);
    }

    public function kelas()
    {
        return $this->belongsTo(Kelas::class);
    }

    public function tagihan()
    {
        return $this->belongsTo(Tagihan::class);
    }

    public function pembayaran()
    {
        return $this->hasMany(Pembayaran::class);
    }

    /**
     * Total amount paid (sum of all pembayaran).
     */
    public function getTotalDibayarAttribute(): float
    {
        return (float) $this->pembayaran()->sum('nominal');
    }

    /**
     * Auto-computed status based on payments vs nominal.
     */
    public function getStatusAttribute(): string
    {
        $nominal = (float) $this->nominal;
        $dibayar = $this->total_dibayar;

        if ($nominal <= 0)
            return 'belum';
        if ($dibayar <= 0)
            return 'belum';
        if ($dibayar >= $nominal)
            return 'lunas';
        return 'cicilan';
    }
}
