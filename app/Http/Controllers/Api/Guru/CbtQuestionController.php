<?php

namespace App\Http\Controllers\Api\Guru;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\CbtQuestion;
use App\Models\CbtQuestionBank;
use Illuminate\Support\Facades\Auth;

class CbtQuestionController extends Controller
{
    private function checkAccess($bankId)
    {
        $guruId = Auth::user()->guru_id ?? Auth::user()->guru->id ?? 1;
        $bank = CbtQuestionBank::findOrFail($bankId);
        
        $taughtMapelIds = \App\Models\Jadwal::where('guru_id', $guruId)->pluck('mapel_id')->unique();
        
        \Log::info("checkAccess: bankId={$bankId}, mapel_id={$bank->mapel_id}, guruId={$guruId}, bank_guru_id=" . ($bank->guru_id ?? 'null') . ", taughtMapels=" . json_encode($taughtMapelIds->toArray()));
        
        if ($bank->guru_id !== $guruId && !$taughtMapelIds->contains($bank->mapel_id)) {
            \Log::warning("checkAccess: FORBIDDEN! Aborting 403.");
            abort(403, 'Unauthorized access to this question bank.');
        }
    }

    private function checkQuestionAccess($questionId)
    {
        $guruId = Auth::user()->guru_id ?? Auth::user()->guru->id ?? 1;
        $question = CbtQuestion::with('questionBank')->findOrFail($questionId);
        $bank = $question->questionBank;
        
        $taughtMapelIds = \App\Models\Jadwal::where('guru_id', $guruId)->pluck('mapel_id')->unique();
        
        if ($bank->guru_id !== $guruId && !$taughtMapelIds->contains($bank->mapel_id)) {
            abort(403, 'Unauthorized access to this question.');
        }
        return $question;
    }

    public function index($bankId)
    {
        $this->checkAccess($bankId);
        $questions = CbtQuestion::where('question_bank_id', $bankId)->get();
        \Log::info("CbtQuestionController@index called. bankId: {$bankId}, count: " . count($questions));
        return response()->json(['data' => $questions]);
    }

    public function store(Request $request, $bankId)
    {
        $this->checkAccess($bankId);
        $validated = $request->validate([
            'type' => 'required|string',
            'content' => 'required|string',
            'options' => 'nullable|string',
            'correct_answer' => 'nullable|string',
            'weight' => 'required|numeric',
        ]);

        $validated['question_bank_id'] = $bankId;
        $question = CbtQuestion::create($validated);
        return response()->json(['message' => 'Soal berhasil ditambahkan', 'data' => $question]);
    }

    public function update(Request $request, $id)
    {
        $question = $this->checkQuestionAccess($id);
        $validated = $request->validate([
            'type' => 'required|string',
            'content' => 'required|string',
            'options' => 'nullable|string',
            'correct_answer' => 'nullable|string',
            'weight' => 'required|numeric',
        ]);
        $question->update($validated);
        return response()->json(['message' => 'Soal berhasil diupdate']);
    }

    public function destroy($id)
    {
        $question = $this->checkQuestionAccess($id);
        $question->delete();
        return response()->json(['message' => 'Soal berhasil dihapus']);
    }
}
