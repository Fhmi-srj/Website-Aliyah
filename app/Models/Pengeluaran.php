<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Pengeluaran extends Model
{
    use HasFactory;

    protected $table = 'pengeluaran';

    protected $fillable = [
        'admin_id',
        'sumber_id',
        'nominal',
        'kategori_id',
        'keterangan',
        'tanggal',
        'tahun_ajaran_id',
    ];

    protected $casts = [
        'nominal' => 'decimal:2',
        'tanggal' => 'date',
    ];

    public function admin()
    {
        return $this->belongsTo(User::class, 'admin_id');
    }

    public function sumber()
    {
        return $this->belongsTo(TransaksiKategori::class, 'sumber_id');
    }

    public function kategori()
    {
        return $this->belongsTo(TransaksiKategori::class, 'kategori_id');
    }

    public function tahunAjaran()
    {
        return $this->belongsTo(TahunAjaran::class);
    }
}
