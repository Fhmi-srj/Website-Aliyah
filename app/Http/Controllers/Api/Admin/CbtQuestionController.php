<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\CbtQuestion;

class CbtQuestionController extends Controller
{
    public function index($bankId)
    {
        $questions = CbtQuestion::where('question_bank_id', $bankId)->get();
        return response()->json(['data' => $questions]);
    }

    public function store(Request $request, $bankId)
    {
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
        $question = CbtQuestion::findOrFail($id);
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
        $question = CbtQuestion::findOrFail($id);
        $question->delete();
        return response()->json(['message' => 'Soal berhasil dihapus']);
    }
}
