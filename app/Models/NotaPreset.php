<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class NotaPreset extends Model
{
    use HasFactory;

    protected $fillable = [
        'nota_template_id',
        'nama',
        'data',
    ];

    protected $casts = [
        'data' => 'array',
    ];

    public function template()
    {
        return $this->belongsTo(NotaTemplate::class, 'nota_template_id');
    }
}
