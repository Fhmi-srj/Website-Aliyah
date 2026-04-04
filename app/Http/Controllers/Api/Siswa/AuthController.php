<?php

namespace App\Http\Controllers\Api\Siswa;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Siswa;
use App\Models\Setting;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'nisn' => 'required|string',
            'password' => 'required|string', // which is also NISN
        ]);

        $siswa = Siswa::where('nisn', $request->nisn)->with('kelas')->first();

        if (!$siswa || $request->password !== $siswa->nisn) {
            return response()->json([
                'message' => 'NISN atau kata sandi tidak valid.'
            ], 401);
        }

        if ($siswa->status !== 'Aktif') {
            return response()->json([
                'message' => 'Status siswa tidak aktif. Hubungi administrator.'
            ], 403);
        }

        // Revoke existing tokens for web or create new one
        $siswa->tokens()->where('name', 'siswa-web-token')->delete();
        $token = $siswa->createToken('siswa-web-token')->plainTextToken;

        return response()->json([
            'message' => 'Login berhasil',
            'user' => [
                'id' => $siswa->id,
                'nama' => $siswa->nama,
                'nisn' => $siswa->nisn,
                'nis' => $siswa->nis,
                'kelas' => $siswa->kelas ? ['kode_kelas' => $siswa->kelas->kode_kelas] : null,
                'roles' => ['siswa'],
            ],
            'token' => $token,
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Logged out success']);
    }

    public function me(Request $request)
    {
        $siswa = $request->user()->load(['kelas', 'tahunAjaran']);
        return response()->json([
            'user' => [
                'id' => $siswa->id,
                'nama' => $siswa->nama,
                'nisn' => $siswa->nisn,
                'nis' => $siswa->nis,
                'kelas' => $siswa->kelas,
                'tahun_ajaran' => $siswa->tahunAjaran,
                'roles' => ['siswa'],
            ]
        ]);
    }

    public function changePassword(Request $request)
    {
        $request->validate([
            'current_password' => 'required',
            'new_password' => 'required|min:6|confirmed',
        ]);

        $siswa = $request->user();

        // Check if current password matches hashed password, or plain-text NISN fallback
        $passwordValid = $siswa->password
            ? Hash::check($request->current_password, $siswa->password)
            : ($request->current_password === $siswa->nisn);

        if (!$passwordValid) {
            return response()->json([
                'message' => 'Password saat ini salah.'
            ], 422);
        }

        $siswa->update([
            'password' => $request->new_password
        ]);

        return response()->json([
            'message' => 'Password berhasil diubah. Silakan gunakan password baru untuk login selanjutnya.'
        ]);
    }
}
