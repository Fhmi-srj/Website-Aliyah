<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class CbtQuestionBankController extends Controller
{
    public function index()
    {
        $banks = \App\Models\CbtQuestionBank::with(['mapel', 'guru'])
            ->withCount('questions')
            ->orderBy('id', 'desc')->get();
        return response()->json(['data' => $banks]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'mapel_id' => 'required|exists:mapel,id',
            'guru_id' => 'nullable|exists:guru,id',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);
        
        $validated['kode_bank'] = 'BS-' . time() . '-' . rand(100,999);
        
        $bank = \App\Models\CbtQuestionBank::create($validated);
        return response()->json(['message' => 'Bank soal berhasil dibuat.', 'data' => $bank]);
    }

    public function generate(Request $request)
    {
        $validated = $request->validate([
            'prefix' => 'required|string|max:255',
        ]);

        $mapels = \App\Models\Mapel::orderBy('nama_mapel', 'asc')->get();
        $generatedCount = 0;

        foreach ($mapels as $mapel) {
            \App\Models\CbtQuestionBank::create([
                'kode_bank' => 'BS-' . time() . '-' . rand(100,999) . '-' . $mapel->id,
                'mapel_id' => $mapel->id,
                'guru_id' => null,
                'name' => $validated['prefix'] . ' - ' . $mapel->nama_mapel,
                'description' => 'Mata Pelajaran: ' . $mapel->nama_mapel,
            ]);
            $generatedCount++;
        }

        return response()->json([
            'message' => "$generatedCount Bank Soal berhasil di-generate secara massal."
        ]);
    }

    public function show($id)
    {
        $bank = \App\Models\CbtQuestionBank::with(['mapel', 'guru', 'questions'])->findOrFail($id);
        return response()->json(['data' => $bank]);
    }

    public function update(Request $request, $id)
    {
        $bank = \App\Models\CbtQuestionBank::findOrFail($id);
        
        $validated = $request->validate([
            'mapel_id' => 'required|exists:mapel,id',
            'guru_id' => 'nullable|exists:guru,id',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);
        
        $bank->update($validated);
        return response()->json(['message' => 'Bank soal berhasil diupdate.', 'data' => $bank]);
    }

    public function destroy($id)
    {
        $bank = \App\Models\CbtQuestionBank::findOrFail($id);
        $bank->delete();
        return response()->json(['message' => 'Bank soal berhasil dihapus.']);
    }
}
