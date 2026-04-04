<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CbtQuestion extends Model
{
    protected $fillable = ['question_bank_id', 'type', 'content', 'options', 'correct_answer', 'weight'];

    protected $casts = [
        'options' => 'array',
        'correct_answer' => 'array',
        'weight' => 'decimal:2',
    ];

    public function questionBank()
    {
        return $this->belongsTo(CbtQuestionBank::class, 'question_bank_id');
    }
}
