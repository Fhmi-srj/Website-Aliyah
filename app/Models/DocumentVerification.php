<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class DocumentVerification extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'jenis_dokumen',
        'perihal',
        'dikeluarkan_oleh',
        'nip_pejabat',
        'tanggal_dokumen',
        'tanggal_cetak',
        'detail',
    ];

    protected $casts = [
        'detail' => 'array',
        'tanggal_dokumen' => 'date',
        'tanggal_cetak' => 'date',
    ];

    protected static function boot()
    {
        parent::boot();
        static::creating(function ($model) {
            if (!$model->id) {
                $model->id = (string) Str::uuid();
            }
        });
    }
}
