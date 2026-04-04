<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class CbtExamController extends Controller
{
    public function index()
    {
        $exams = \App\Models\CbtExam::with('questionBank')
            ->withCount('studentExams')
            ->orderBy('id', 'desc')->get();
        return response()->json(['data' => $exams]);
    }

    public function getProctors()
    {
        $gurus = \App\Models\Guru::select('id', 'nama', 'inisial')->get();
        return response()->json(['data' => $gurus]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'question_bank_id' => 'required|exists:cbt_question_banks,id',
            'name' => 'required|string|max:255',
            'project_name' => 'nullable|string|max:255',
            'duration_minutes' => 'required|integer|min:1',
            'start_time' => 'nullable|date',
            'end_time' => 'nullable|date',
            'randomize_questions' => 'boolean',
            'randomize_options' => 'boolean',
            'status' => 'in:draft,published,finished',
            'proctor_ids' => 'nullable|array',
            'proctor_ids.*' => 'exists:guru,id'
        ]);

        $validated['token'] = strtoupper(\Illuminate\Support\Str::random(6));

        $exam = \App\Models\CbtExam::create($validated);
        return response()->json(['message' => 'Ujian berhasil dibuat.', 'data' => $exam]);
    }

    public function storeBulk(Request $request)
    {
        $validated = $request->validate([
            'sessions' => 'required|array|min:1',
            'sessions.*.name_prefix' => 'nullable|string|max:255',
            'sessions.*.duration_minutes' => 'required|integer|min:1',
            'sessions.*.schedule_mode' => 'required|in:parallel,sequential',
            'sessions.*.start_date' => 'required|date',
            'sessions.*.time_start' => 'required|date_format:H:i',
            'sessions.*.time_end' => 'nullable|date_format:H:i',
            'sessions.*.skip_days' => 'nullable|array',
            'sessions.*.skip_days.*' => 'integer|min:0|max:6',
            'sessions.*.randomize_questions' => 'boolean',
            'sessions.*.randomize_options' => 'boolean',
            'sessions.*.status' => 'in:draft,published,finished',
            'sessions.*.bank_ids' => 'required|array|min:1',
            'sessions.*.bank_ids.*' => 'exists:cbt_question_banks,id'
        ]);

        $createdExams = [];

        \Illuminate\Support\Facades\DB::beginTransaction();
        try {
            foreach ($validated['sessions'] as $session) {
                $skipDays = $session['skip_days'] ?? [];
                $currentDate = \Carbon\Carbon::parse($session['start_date']);
                
                $banks = \App\Models\CbtQuestionBank::whereIn('id', $session['bank_ids'])->get();
                $banksDict = $banks->keyBy('id');
                
                foreach ($session['bank_ids'] as $bankId) {
                    if (!isset($banksDict[$bankId])) continue;
                    $bank = $banksDict[$bankId];

                    if ($session['schedule_mode'] === 'sequential') {
                        // Skip holidays until we find a valid day
                        while (in_array($currentDate->dayOfWeek, $skipDays)) {
                            $currentDate->addDay();
                        }
                    }

                    // Create start_time and end_time
                    // Using setTime(hour, minute, second) is safer than setTimeFromTimeString sometimes
                    $timeStartParts = explode(':', $session['time_start']);
                    $startDateTime = $currentDate->copy()->setTime($timeStartParts[0], $timeStartParts[1], 0)->format('Y-m-d H:i:s');
                    
                    $endDateTime = null;
                    if (!empty($session['time_end'])) {
                        $timeEndParts = explode(':', $session['time_end']);
                        $endDateTime = $currentDate->copy()->setTime($timeEndParts[0], $timeEndParts[1], 0)->format('Y-m-d H:i:s');
                    }

                    $examName = $bank->name;
                    if (!empty($session['name_prefix'])) {
                        $prefix = trim($session['name_prefix']);
                        if (!str_contains($bank->name, $prefix)) {
                            $examName = $prefix . ' - ' . $bank->name;
                        }
                    }

                    $createdExams[] = \App\Models\CbtExam::create([
                        'question_bank_id' => $bank->id,
                        'name' => $examName,
                        'project_name' => !empty($session['name_prefix']) ? trim($session['name_prefix']) : null,
                        'duration_minutes' => $session['duration_minutes'],
                        'start_time' => $startDateTime,
                        'end_time' => $endDateTime,
                        'randomize_questions' => $session['randomize_questions'] ?? false,
                        'randomize_options' => $session['randomize_options'] ?? false,
                        'status' => $session['status'] ?? 'draft',
                        'token' => strtoupper(\Illuminate\Support\Str::random(6)),
                    ]);

                    if ($session['schedule_mode'] === 'sequential') {
                        // Move to next day for the next specific mapel
                        $currentDate->addDay();
                    }
                }
            }
            \Illuminate\Support\Facades\DB::commit();
            return response()->json([
                'message' => count($createdExams) . ' jadwal ujian berhasil di-generate.',
                'data' => $createdExams
            ]);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\DB::rollBack();
            return response()->json([
                'message' => 'Terjadi kesalahan saat generate jadwal massal.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function show($id)
    {
        $exam = \App\Models\CbtExam::with('questionBank')->findOrFail($id);
        return response()->json(['data' => $exam]);
    }

    public function update(Request $request, $id)
    {
        $exam = \App\Models\CbtExam::findOrFail($id);
        
        $validated = $request->validate([
            'question_bank_id' => 'required|exists:cbt_question_banks,id',
            'name' => 'required|string|max:255',
            'project_name' => 'nullable|string|max:255',
            'duration_minutes' => 'required|integer|min:1',
            'start_time' => 'nullable|date',
            'end_time' => 'nullable|date',
            'randomize_questions' => 'boolean',
            'randomize_options' => 'boolean',
            'status' => 'in:draft,published,finished',
            'proctor_ids' => 'nullable|array',
            'proctor_ids.*' => 'exists:guru,id'
        ]);

        $exam->update($validated);
        return response()->json(['message' => 'Ujian berhasil diupdate.', 'data' => $exam]);
    }

    public function destroy($id)
    {
        \App\Models\CbtExam::findOrFail($id)->delete();
        return response()->json(['message' => 'Ujian berhasil dihapus.']);
    }

    public function generateToken($id)
    {
        $exam = \App\Models\CbtExam::findOrFail($id);
        $exam->token = strtoupper(\Illuminate\Support\Str::random(6));
        $exam->save();
        return response()->json(['message' => 'Token baru berhasil di-generate.', 'token' => $exam->token]);
    }

    public function getProjects()
    {
        $projects = \App\Models\CbtExam::whereNotNull('project_name')
            ->distinct()
            ->orderBy('project_name')
            ->pluck('project_name');
        return response()->json(['data' => $projects]);
    }

    public function getResults($id)
    {
        $exam = \App\Models\CbtExam::findOrFail($id);
        $sessions = \App\Models\CbtStudentExam::where('exam_id', $id)
            ->with(['siswa' => function($q) {
                $q->select('id', 'nama', 'nisn', 'kelas_id')->with('kelas:id,kode_kelas');
            }])
            ->get();
            
        return response()->json(['exam' => $exam, 'sessions' => $sessions]);
    }

    public function getStudentAnswers($examId, $studentId)
    {
        $session = \App\Models\CbtStudentExam::where('exam_id', $examId)
            ->where('siswa_id', $studentId)
            ->with(['siswa' => function($q) {
                $q->select('id', 'nama', 'nisn', 'kelas_id')->with('kelas:id,kode_kelas');
            }])
            ->firstOrFail();

        $answers = \App\Models\CbtAnswer::where('student_exam_id', $session->id)
            ->with('question')
            ->get();

        return response()->json([
            'session' => $session,
            'answers' => $answers
        ]);
    }

    public function gradeEssay(Request $request, $examId, $studentId)
    {
        $session = \App\Models\CbtStudentExam::where('exam_id', $examId)
            ->where('siswa_id', $studentId)
            ->firstOrFail();

        $validated = $request->validate([
            'grades' => 'required|array',
            'grades.*.answer_id' => 'required|exists:cbt_answers,id',
            'grades.*.score_awarded' => 'required|numeric'
        ]);

        foreach ($validated['grades'] as $grade) {
            \App\Models\CbtAnswer::where('id', $grade['answer_id'])
                ->where('student_exam_id', $session->id)
                ->update(['score_awarded' => $grade['score_awarded']]);
        }

        // Recalculate total score
        $totalScore = \App\Models\CbtAnswer::where('student_exam_id', $session->id)->sum('score_awarded');
        $session->update(['score' => $totalScore]);

        return response()->json(['message' => 'Nilai esai berhasil disimpan.', 'new_score' => $totalScore]);
    }
}
