<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CbtExam extends Model
{
    protected $fillable = [
        'question_bank_id', 'name', 'project_name', 'duration_minutes', 'start_time', 
        'end_time', 'token', 'randomize_questions', 'randomize_options', 'status', 'proctor_ids'
    ];

    protected $casts = [
        'start_time' => 'datetime',
        'end_time' => 'datetime',
        'randomize_questions' => 'boolean',
        'randomize_options' => 'boolean',
        'proctor_ids' => 'array',
    ];

    public function questionBank()
    {
        return $this->belongsTo(CbtQuestionBank::class, 'question_bank_id');
    }

    public function studentExams()
    {
        return $this->hasMany(CbtStudentExam::class, 'exam_id');
    }
}
