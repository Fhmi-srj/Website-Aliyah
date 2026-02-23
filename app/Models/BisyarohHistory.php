<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BisyarohHistory extends Model
{
    use HasFactory;

    protected $table = 'bisyaroh_histories';

    protected $fillable = [
        'bulan',
        'tahun',
        'label',
        'data',
        'total_guru',
        'total_jumlah',
        'total_penerimaan',
        'status',
        'notes',
        'created_by',
        'locked_by',
        'locked_at',
    ];

    protected $casts = [
        'data' => 'array',
        'locked_at' => 'datetime',
    ];

    /**
     * User who created/saved this history.
     */
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * User who locked this history.
     */
    public function locker()
    {
        return $this->belongsTo(User::class, 'locked_by');
    }
}
