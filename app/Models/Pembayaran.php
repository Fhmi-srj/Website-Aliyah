<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Pembayaran extends Model
{
    protected $table = 'pembayaran';

    protected $fillable = [
        'tagihan_siswa_id',
        'nominal',
        'tanggal_bayar',
        'catatan',
        'admin_id',
    ];

    protected $casts = [
        'nominal' => 'decimal:2',
        'tanggal_bayar' => 'date',
    ];

    public function tagihanSiswa()
    {
        return $this->belongsTo(TagihanSiswa::class);
    }

    public function admin()
    {
        return $this->belongsTo(User::class, 'admin_id');
    }
}
