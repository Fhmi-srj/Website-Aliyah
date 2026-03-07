<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class NotaTemplate extends Model
{
    use HasFactory;

    protected $fillable = [
        'nama',
        'fields',
        'layout_html',
        'is_active',
    ];

    protected $casts = [
        'fields' => 'array',
        'is_active' => 'boolean',
    ];

    public function history()
    {
        return $this->hasMany(NotaHistory::class);
    }
}
