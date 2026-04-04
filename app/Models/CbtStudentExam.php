<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CbtStudentExam extends Model
{
    protected $fillable = ['exam_id', 'siswa_id', 'status', 'started_at', 'finished_at', 'score', 'fraud_logs', 'snapshot_urls'];

    protected $casts = [
        'started_at' => 'datetime',
        'finished_at' => 'datetime',
        'fraud_logs' => 'array',
        'snapshot_urls' => 'array',
        'score' => 'decimal:2',
    ];

    public function exam()
    {
        return $this->belongsTo(CbtExam::class, 'exam_id');
    }

    public function siswa()
    {
        return $this->belongsTo(Siswa::class, 'siswa_id');
    }

    public function answers()
    {
        return $this->hasMany(CbtAnswer::class, 'student_exam_id');
    }
}
