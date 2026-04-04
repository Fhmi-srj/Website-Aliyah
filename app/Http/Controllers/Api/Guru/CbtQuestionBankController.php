<?php

namespace App\Http\Controllers\Api\Guru;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class CbtQuestionBankController extends Controller
{
    private function getGuruId() {
        // Retrieve the guru_id natively from the User model to prevent null relation issues
        return \Illuminate\Support\Facades\Auth::user()->guru_id ?? \Illuminate\Support\Facades\Auth::user()->guru->id ?? 1;
    }

    public function index()
    {
        $guruId = $this->getGuruId();
        $taughtMapelIds = \App\Models\Jadwal::where('guru_id', $guruId)->pluck('mapel_id')->unique();
        
        // Also include manually assigned banks explicitly if any
        $banks = \App\Models\CbtQuestionBank::with(['mapel'])
            ->where(function($q) use ($taughtMapelIds, $guruId) {
                $q->whereIn('mapel_id', $taughtMapelIds)
                  ->orWhere('guru_id', $guruId);
            })
            ->withCount('questions')
            ->orderBy('id', 'desc')->get();
            
        return response()->json(['data' => $banks]);
    }

    public function store(Request $request)
    {
        $guruId = $this->getGuruId();
        
        $validated = $request->validate([
            'kode_bank' => 'required|string|unique:cbt_question_banks',
            'mapel_id' => 'required|exists:mapel,id',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);
        
        $validated['guru_id'] = $guruId;
        
        $bank = \App\Models\CbtQuestionBank::create($validated);
        return response()->json(['message' => 'Bank soal berhasil dibuat.', 'data' => $bank]);
    }

    public function show($id)
    {
        $guruId = $this->getGuruId();
        $taughtMapelIds = \App\Models\Jadwal::where('guru_id', $guruId)->pluck('mapel_id')->unique();
        
        $bank = \App\Models\CbtQuestionBank::with(['mapel', 'questions'])
            ->where(function($query) use ($taughtMapelIds, $guruId) {
                $query->whereIn('mapel_id', $taughtMapelIds)
                      ->orWhere('guru_id', $guruId);
            })
            ->findOrFail($id);
            
        return response()->json(['data' => $bank]);
    }

    public function update(Request $request, $id)
    {
        $guruId = $this->getGuruId();
        $bank = \App\Models\CbtQuestionBank::where('guru_id', $guruId)->findOrFail($id);
        
        $validated = $request->validate([
            'kode_bank' => 'required|string|unique:cbt_question_banks,kode_bank,' . $bank->id,
            'mapel_id' => 'required|exists:mapel,id',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);
        
        $bank->update($validated);
        return response()->json(['message' => 'Bank soal berhasil diupdate.', 'data' => $bank]);
    }

    public function destroy($id)
    {
        $guruId = $this->getGuruId();
        $bank = \App\Models\CbtQuestionBank::where('guru_id', $guruId)->findOrFail($id);
        $bank->delete();
        return response()->json(['message' => 'Bank soal berhasil dihapus.']);
    }
}
