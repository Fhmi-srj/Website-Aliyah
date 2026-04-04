<?php

namespace App\Http\Controllers\Api\Siswa;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\CbtExam;
use App\Models\CbtStudentExam;

class DashboardController extends Controller
{
    public function getInfo(Request $request)
    {
        $siswa = $request->user()->load(['kelas', 'tahunAjaran']);
        
        // Fetch exams related statistics or other dashboard info here
        return response()->json([
            'user' => [
                'id' => $siswa->id,
                'nama' => $siswa->nama,
                'nisn' => $siswa->nisn,
                'kelas' => $siswa->kelas ? $siswa->kelas->nama_kelas : '-',
                'jenis_kelamin' => $siswa->jenis_kelamin,
            ],
            'info' => [
                'tahun_ajaran' => $siswa->tahunAjaran ? $siswa->tahunAjaran->nama : '-',
            ]
        ]);
    }

    public function getActiveExams(Request $request)
    {
        $siswa = $request->user();
        
        // Since there is no direct kelas_id mapping on exams in current schema, 
        // we'll fetch 'published' and 'finished' exams, ordered by latest.
        // In a real scenario, this might be filtered by finding mapel taught to the student's kelas.
        
        $exams = CbtExam::whereIn('status', ['published', 'finished'])
                    ->with('questionBank.mapel')
                    ->orderBy('id', 'desc')
                    ->take(20)
                    ->get();
                    
        // Attach student's session status to each exam
        $examsArray = $exams->map(function($exam) use ($siswa) {
            $session = CbtStudentExam::where('exam_id', $exam->id)
                                    ->where('siswa_id', $siswa->id)
                                    ->first();
                                    
            return [
                'id' => $exam->id,
                'name' => $exam->name,
                'mapel' => $exam->questionBank && $exam->questionBank->mapel ? $exam->questionBank->mapel->nama_mapel : 'Umum',
                'duration_minutes' => $exam->duration_minutes,
                'start_time' => $exam->start_time,
                'end_time' => $exam->end_time,
                'status' => $exam->status,
                'session_status' => $session ? $session->status : 'not_started',
                'score' => $session ? $session->score : null,
                // Include token only if published and not finished
                'token' => $exam->status === 'published' ? $exam->token : null, 
            ];
        });

        return response()->json(['data' => $examsArray]);
    }
}
