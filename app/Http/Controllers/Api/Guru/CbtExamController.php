<?php

namespace App\Http\Controllers\Api\Guru;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class CbtExamController extends Controller
{
    private function getGuruId() {
        return \Illuminate\Support\Facades\Auth::user()->guru->id ?? 1;
    }

    public function index()
    {
        $guruId = $this->getGuruId();
        $taughtMapelIds = \App\Models\Jadwal::where('guru_id', $guruId)->pluck('mapel_id')->unique();
        
        $exams = \App\Models\CbtExam::whereHas('questionBank', function($q) use ($guruId, $taughtMapelIds) {
                $q->where(function($query) use ($guruId, $taughtMapelIds) {
                    $query->whereIn('mapel_id', $taughtMapelIds)
                          ->orWhere('guru_id', $guruId);
                });
            })
            ->with('questionBank')
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
        $guruId = $this->getGuruId();
        
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

        \App\Models\CbtQuestionBank::where('id', $validated['question_bank_id'])
            ->where('guru_id', $guruId)
            ->firstOrFail();

        $validated['token'] = strtoupper(\Illuminate\Support\Str::random(6));

        $exam = \App\Models\CbtExam::create($validated);
        return response()->json(['message' => 'Ujian berhasil dibuat.', 'data' => $exam]);
    }

    public function storeBulk(Request $request)
    {
        $guruId = $this->getGuruId();
        
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
                // Ensure Guru owns the banks
                $skipDays = $session['skip_days'] ?? [];
                $currentDate = \Carbon\Carbon::parse($session['start_date']);
                
                $banks = \App\Models\CbtQuestionBank::whereIn('id', $session['bank_ids'])
                            ->where('guru_id', $guruId)->get();
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
        $guruId = $this->getGuruId();
        $taughtMapelIds = \App\Models\Jadwal::where('guru_id', $guruId)->pluck('mapel_id')->unique();
        
        $exam = \App\Models\CbtExam::whereHas('questionBank', function($q) use ($guruId, $taughtMapelIds) {
                $q->where(function($query) use ($guruId, $taughtMapelIds) {
                    $query->whereIn('mapel_id', $taughtMapelIds)
                          ->orWhere('guru_id', $guruId);
                });
            })
            ->with('questionBank')
            ->findOrFail($id);
            
        return response()->json(['data' => $exam]);
    }

    public function update(Request $request, $id)
    {
        $guruId = $this->getGuruId();
        $exam = \App\Models\CbtExam::whereHas('questionBank', function($q) use ($guruId) {
                $q->where('guru_id', $guruId);
            })->findOrFail($id);
        
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

        \App\Models\CbtQuestionBank::where('id', $validated['question_bank_id'])
            ->where('guru_id', $guruId)
            ->firstOrFail();

        $exam->update($validated);
        return response()->json(['message' => 'Ujian berhasil diupdate.', 'data' => $exam]);
    }

    public function getProjects()
    {
        $guruId = $this->getGuruId();
        $taughtMapelIds = \App\Models\Jadwal::where('guru_id', $guruId)->pluck('mapel_id')->unique();
        $projects = \App\Models\CbtExam::whereHas('questionBank', function($q) use ($guruId, $taughtMapelIds) {
                $q->where(function($query) use ($guruId, $taughtMapelIds) {
                    $query->whereIn('mapel_id', $taughtMapelIds)->orWhere('guru_id', $guruId);
                });
            })
            ->whereNotNull('project_name')
            ->distinct()
            ->orderBy('project_name')
            ->pluck('project_name');
        return response()->json(['data' => $projects]);
    }

    public function destroy($id)
    {
        $guruId = $this->getGuruId();
        $exam = \App\Models\CbtExam::whereHas('questionBank', function($q) use ($guruId) {
                $q->where('guru_id', $guruId);
            })->findOrFail($id);
            
        $exam->delete();
        return response()->json(['message' => 'Ujian berhasil dihapus.']);
    }

    public function getResults($id)
    {
        $guruId = $this->getGuruId();
        $taughtMapelIds = \App\Models\Jadwal::where('guru_id', $guruId)->pluck('mapel_id')->unique();

        $exam = \App\Models\CbtExam::whereHas('questionBank', function($q) use ($guruId, $taughtMapelIds) {
                $q->where(function($query) use ($guruId, $taughtMapelIds) {
                    $query->whereIn('mapel_id', $taughtMapelIds)
                          ->orWhere('guru_id', $guruId);
                });
            })->findOrFail($id);

        $sessions = \App\Models\CbtStudentExam::where('exam_id', $id)
            ->with(['siswa' => function($q) {
                $q->select('id', 'nama', 'nisn', 'kelas_id')->with('kelas:id,kode_kelas');
            }])
            ->get();
            
        return response()->json(['exam' => $exam, 'sessions' => $sessions]);
    }

    public function getStudentAnswers($examId, $studentId)
    {
        $guruId = $this->getGuruId();
        $taughtMapelIds = \App\Models\Jadwal::where('guru_id', $guruId)->pluck('mapel_id')->unique();

        $exam = \App\Models\CbtExam::whereHas('questionBank', function($q) use ($guruId, $taughtMapelIds) {
                $q->where(function($query) use ($guruId, $taughtMapelIds) {
                    $query->whereIn('mapel_id', $taughtMapelIds)
                          ->orWhere('guru_id', $guruId);
                });
            })->findOrFail($examId);

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
        $guruId = $this->getGuruId();
        $taughtMapelIds = \App\Models\Jadwal::where('guru_id', $guruId)->pluck('mapel_id')->unique();

        $exam = \App\Models\CbtExam::whereHas('questionBank', function($q) use ($guruId, $taughtMapelIds) {
                $q->where(function($query) use ($guruId, $taughtMapelIds) {
                    $query->whereIn('mapel_id', $taughtMapelIds)
                          ->orWhere('guru_id', $guruId);
                });
            })->findOrFail($examId);

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
