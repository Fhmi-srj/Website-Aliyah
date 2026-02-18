<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TransaksiKategori extends Model
{
    use HasFactory;

    protected $table = 'transaksi_kategori';

    protected $fillable = [
        'nama',
        'tipe',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function scopeByTipe($query, $tipe)
    {
        return $query->where('tipe', $tipe)->where('is_active', true);
    }

    public function scopeSumberPemasukan($query)
    {
        return $query->byTipe('sumber_pemasukan');
    }

    public function scopeSumberPengeluaran($query)
    {
        return $query->byTipe('sumber_pengeluaran');
    }

    public function scopeKategoriPengeluaran($query)
    {
        return $query->byTipe('kategori_pengeluaran');
    }
}
