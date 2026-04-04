<?php

namespace App\Http\Controllers\Api\Siswa;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class CbtStudentController extends Controller
{
    private function getSiswaId() {
        $user = \Illuminate\Support\Facades\Auth::user();
        // Case 1: The authenticated user IS a Siswa model (login via unified login)
        if ($user instanceof \App\Models\Siswa) {
            return $user->id;
        }
        // Case 2: Legacy - the authenticated user is a User model with a siswa relationship
        if ($user && $user->siswa) {
            return $user->siswa->id;
        }
        abort(403, 'Akses khusus Siswa.');
    }

    public function getAvailableExams()
    {
        $exams = \App\Models\CbtExam::where('status', 'published')
            ->with('questionBank')
            ->orderBy('id', 'desc')->get();
        return response()->json(['data' => $exams]);
    }

    public function joinExam(Request $request, $id)
    {
        $siswaId = $this->getSiswaId();
        
        $request->validate(['token' => 'required|string']);
        
        $exam = \App\Models\CbtExam::where('status', 'published')->findOrFail($id);
        
        if ($exam->token !== $request->token) {
            return response()->json(['message' => 'Token ujian tidak valid.'], 400);
        }

        $session = \App\Models\CbtStudentExam::firstOrCreate(
            ['exam_id' => $exam->id, 'siswa_id' => $siswaId],
            ['status' => 'ongoing']
        );

        if (!$session->started_at) {
            $session->started_at = now();
            $session->save();
        }

        if ($session->status === 'finished') {
            return response()->json(['message' => 'Anda sudah menyelesaikan ujian ini.'], 400);
        }

        return response()->json(['message' => 'Berhasil masuk ke ujian.', 'data' => $session]);
    }

    public function getQuestions($id)
    {
        $siswaId = $this->getSiswaId();
        
        $session = \App\Models\CbtStudentExam::where('exam_id', $id)
            ->where('siswa_id', $siswaId)
            ->where('status', 'ongoing')
            ->firstOrFail();

        $exam = \App\Models\CbtExam::with(['questionBank.questions'])->findOrFail($id);
        $questions = $exam->questionBank->questions;

        // Shuffle logic securely seeded with session ID to ensure consistency on refresh
        if ($exam->randomize_questions) {
            mt_srand($session->id);
            $questionsArray = $questions->all();
            shuffle($questionsArray);
            $questions = collect($questionsArray);
            mt_srand(); // reset seed
        }

        // Shuffle options if enabled
        if ($exam->randomize_options) {
            $questions->transform(function ($q) use ($session) {
                if ($q->type === 'multiple_choice' && !empty($q->options)) {
                    $options = is_string($q->options) ? json_decode($q->options, true) : $q->options;
                    if (is_array($options)) {
                        mt_srand(crc32($session->id . '_' . $q->id)); // Unique consistent seed per question per student
                        shuffle($options);
                        $q->options = $options;
                        mt_srand();
                    }
                }
                return $q;
            });
        }

        // Hide correct responses to prevent cheating via API response inspection
        $questions->makeHidden('correct_answer');

        return response()->json([
            'session' => $session,
            'questions' => $questions
        ]);
    }

    public function submitAnswer(Request $request, $id)
    {
        $siswaId = $this->getSiswaId();
        
        $session = \App\Models\CbtStudentExam::where('exam_id', $id)
            ->where('siswa_id', $siswaId)
            ->where('status', 'ongoing')
            ->firstOrFail();

        $validated = $request->validate([
            'question_id' => 'required|exists:cbt_questions,id',
            'answer' => 'required'
        ]);

        \App\Models\CbtAnswer::updateOrCreate(
            ['student_exam_id' => $session->id, 'question_id' => $validated['question_id']],
            ['answer' => is_array($validated['answer']) ? json_encode($validated['answer']) : $validated['answer']]
        );

        return response()->json(['message' => 'Jawaban disimpan.']);
    }

    public function finishExam(Request $request, $id)
    {
        $siswaId = $this->getSiswaId();
        
        $session = \App\Models\CbtStudentExam::where('exam_id', $id)
            ->where('siswa_id', $siswaId)
            ->where('status', 'ongoing')
            ->firstOrFail();

        $session->update([
            'status' => 'finished',
            'finished_at' => now()
        ]);

        return response()->json(['message' => 'Ujian selesai.']);
    }
}
