<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CbtQuestionBank extends Model
{
    protected $fillable = ['kode_bank', 'mapel_id', 'guru_id', 'name', 'description'];

    public function mapel()
    {
        return $this->belongsTo(Mapel::class);
    }

    public function guru()
    {
        return $this->belongsTo(Guru::class);
    }

    public function questions()
    {
        return $this->hasMany(CbtQuestion::class, 'question_bank_id');
    }

    public function exams()
    {
        return $this->hasMany(CbtExam::class, 'question_bank_id');
    }
}
