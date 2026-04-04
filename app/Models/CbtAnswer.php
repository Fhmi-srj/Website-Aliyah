<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CbtAnswer extends Model
{
    protected $fillable = ['student_exam_id', 'question_id', 'answer', 'is_correct', 'score_awarded'];

    protected $casts = [
        'is_correct' => 'boolean',
        'score_awarded' => 'decimal:2',
    ];

    public function studentExam()
    {
        return $this->belongsTo(CbtStudentExam::class, 'student_exam_id');
    }

    public function question()
    {
        return $this->belongsTo(CbtQuestion::class, 'question_id');
    }
}
