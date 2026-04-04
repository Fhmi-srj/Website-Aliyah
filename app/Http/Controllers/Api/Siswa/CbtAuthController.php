<?php

namespace App\Http\Controllers\Api\Siswa;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Siswa;
use App\Models\CbtExam;
use App\Models\TahunAjaran;

class CbtAuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'nisn' => 'required|string',
            'token' => 'required|string'
        ]);

        // Find active exam with this token
        $exam = CbtExam::where('token', $request->token)
            ->where('status', 'published')
            ->first();

        if (!$exam) {
            return response()->json([
                'success' => false,
                'message' => 'Token ujian tidak valid atau ujian belum dimulai.'
            ], 401);
        }

        // Find active student by NISN
        $siswa = Siswa::where('nisn', $request->nisn)
            ->whereIn('status', ['Aktif'])
            ->first();

        if (!$siswa) {
            return response()->json([
                'success' => false,
                'message' => 'NISN tidak ditemukan atau status siswa tidak aktif.'
            ], 401);
        }

        // In a real scenario, we might want to check if the student is in a class that's assigned to this exam.
        // For now, we assume if they have the token, they can take it.

        $activeTahunAjaran = TahunAjaran::where('is_active', true)->first();

        // Expire older tokens for this student (only one active session allowed)
        $siswa->tokens()->delete();

        // Create token for student
        $token = $siswa->createToken('cbt-student-token')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Login berhasil.',
            'data' => [
                'token' => $token,
                'student' => [
                    'id' => $siswa->id,
                    'nama' => $siswa->nama,
                    'nisn' => $siswa->nisn
                ],
                'exam' => [
                    'id' => $exam->id,
                    'name' => $exam->name
                ]
            ]
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        
        return response()->json([
            'success' => true,
            'message' => 'Logout berhasil.'
        ]);
    }
    
    public function me(Request $request)
    {
        $siswa = $request->user();
        return response()->json([
            'success' => true,
            'data' => [
                'id' => $siswa->id,
                'nama' => $siswa->nama,
                'nisn' => $siswa->nisn,
                'role' => 'siswa'
            ]
        ]);
    }
}
