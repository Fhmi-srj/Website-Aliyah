<?php

namespace App\Http\Controllers\Api\Guru;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\CbtQuestion;
use App\Models\CbtQuestionBank;
use Illuminate\Support\Facades\Auth;

class CbtBulkQuestionController extends Controller
{
    private function getGuruId() {
        return Auth::user()->guru->id ?? 1;
    }

    public function store(Request $request, $bankId)
    {
        $guruId = $this->getGuruId();
        $taughtMapelIds = \App\Models\Jadwal::where('guru_id', $guruId)->pluck('mapel_id')->unique();

        // Validate the guru has access to this bank (via taught mapel or direct assignment)
        $bank = CbtQuestionBank::where(function($q) use ($taughtMapelIds, $guruId) {
            $q->whereIn('mapel_id', $taughtMapelIds)->orWhere('guru_id', $guruId);
        })->findOrFail($bankId);

        $validated = $request->validate([
            'questions'              => 'required|array|min:1',
            'questions.*.type'       => 'required|in:multiple_choice,essay,ms_choice,true_false',
            'questions.*.content'    => 'required|string',
            'questions.*.weight'     => 'nullable|numeric|min:1',
            'questions.*.correct_answer' => 'nullable|string',
        ]);

        $inserted = 0;
        $errors   = [];

        foreach ($validated['questions'] as $i => $q) {
            try {
                $options = null;
                $correctAnswer = null;

                if (in_array($q['type'], ['multiple_choice', 'ms_choice', 'true_false'])) {
                    $raw = $request->input("questions.$i");
                    
                    if ($q['type'] === 'true_false') {
                        $optArr = [['id' => 'A', 'text' => 'Benar'], ['id' => 'B', 'text' => 'Salah']];
                        $correctAnswer = json_encode(strtoupper($q['correct_answer'] ?? 'A'));
                    } else {
                        $optArr = [];
                        foreach (['A', 'B', 'C', 'D', 'E'] as $letter) {
                            $key = 'option_' . strtolower($letter);
                            if (!empty($raw[$key])) {
                                $optArr[] = ['id' => $letter, 'text' => $raw[$key]];
                            }
                        }
                        
                        if ($q['type'] === 'ms_choice') {
                            // "A,C" -> '["A","C"]'
                            $ca = array_map('trim', explode(',', strtoupper($q['correct_answer'] ?? 'A')));
                            $correctAnswer = json_encode($ca);
                        } else {
                            $correctAnswer = json_encode(strtoupper($q['correct_answer'] ?? 'A'));
                        }
                    }
                    $options = json_encode($optArr);
                }

                CbtQuestion::create([
                    'question_bank_id' => $bank->id,
                    'type'             => $q['type'],
                    'content'          => $q['content'],
                    'options'          => $options,
                    'correct_answer'   => $correctAnswer,
                    'weight'           => $q['weight'] ?? 1,
                ]);

                $inserted++;
            } catch (\Exception $e) {
                $errors[] = "Baris " . ($i + 2) . ": " . $e->getMessage();
            }
        }

        return response()->json([
            'message' => "$inserted soal berhasil diimpor.",
            'inserted' => $inserted,
            'errors'  => $errors,
        ]);
    }
}
