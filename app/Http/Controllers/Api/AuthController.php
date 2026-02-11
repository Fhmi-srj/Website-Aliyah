<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Guru;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Login user and generate token
     * Supports both superadmin (from users table) and guru (from guru table)
     */
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'username' => 'required|string',
            'password' => 'required|string',
            'remember' => 'boolean',
            'tahun_ajaran_id' => 'required|exists:tahun_ajaran,id',
        ]);

        // Rate limiting: 5 attempts per 15 minutes per IP
        $key = 'login:' . $request->ip();

        if (RateLimiter::tooManyAttempts($key, 5)) {
            $seconds = RateLimiter::availableIn($key);
            return response()->json([
                'success' => false,
                'message' => "Terlalu banyak percobaan login. Coba lagi dalam {$seconds} detik."
            ], 429);
        }

        // First, try to find from users table (superadmin)
        $user = User::where('username', $request->username)->first();

        // If not found in users, try guru table
        if (!$user) {
            $guru = Guru::where('username', $request->username)
                ->where('status', 'Aktif')
                ->first();

            if ($guru) {
                // Verify password from guru table
                if (!Hash::check($request->password, $guru->password)) {
                    RateLimiter::hit($key, 900);
                    return response()->json([
                        'success' => false,
                        'message' => 'Username atau password salah.'
                    ], 401);
                }

                // Login successful - find or create user record for this guru
                $user = User::firstOrCreate(
                    ['guru_id' => $guru->id],
                    [
                        'username' => $guru->username,
                        'name' => $guru->nama,
                        'password' => $guru->password, // Already hashed
                        'role' => 'guru',
                        'is_active' => true,
                    ]
                );

                // Update user data if guru data changed
                $user->update([
                    'username' => $guru->username,
                    'name' => $guru->nama,
                    'password' => $guru->password,
                ]);
            }
        }

        if (!$user) {
            RateLimiter::hit($key, 900); // 15 minutes
            return response()->json([
                'success' => false,
                'message' => 'Username atau password salah.'
            ], 401);
        }

        // Check if account is locked (only for users table)
        if ($user->isLocked()) {
            $minutes = $user->locked_until->diffInMinutes(now());
            return response()->json([
                'success' => false,
                'message' => "Akun terkunci. Coba lagi dalam {$minutes} menit."
            ], 423);
        }

        // Check if account is active
        if (!$user->is_active) {
            return response()->json([
                'success' => false,
                'message' => 'Akun tidak aktif. Hubungi administrator.'
            ], 403);
        }

        // Verify password (for superadmin from users table)
        if ($user->role === 'superadmin' && !Hash::check($request->password, $user->password)) {
            RateLimiter::hit($key, 900);
            $user->incrementFailedAttempts();

            $remaining = 5 - $user->failed_login_attempts;
            $message = $remaining > 0
                ? "Password salah. Sisa percobaan: {$remaining}."
                : "Akun terkunci selama 30 menit.";

            return response()->json([
                'success' => false,
                'message' => $message
            ], 401);
        }

        // Successful login
        RateLimiter::clear($key);
        $user->resetFailedAttempts();

        // Save selected tahun_ajaran to user
        $user->tahun_ajaran_id = $request->tahun_ajaran_id;
        $user->save();

        // Load tahun_ajaran data
        $tahunAjaran = \App\Models\TahunAjaran::find($request->tahun_ajaran_id);

        // Token expiration: 2 hours default, 30 days if remember
        $expiration = $request->remember ? now()->addDays(30) : now()->addHours(2);

        // Revoke old tokens
        $user->tokens()->delete();

        // Create new token
        $token = $user->createToken('auth-token', ['*'], $expiration)->plainTextToken;

        // Get additional data for guru
        $userData = [
            'id' => $user->id,
            'username' => $user->username,
            'name' => $user->name,
            'role' => $user->role,
            'roles' => $user->roles->map(fn($r) => [
                'id' => $r->id,
                'name' => $r->name,
                'display_name' => $r->display_name,
            ])->toArray(),
        ];

        // Add guru-specific data
        if ($user->role === 'guru' && $user->guru_id) {
            $guru = Guru::find($user->guru_id);
            if ($guru) {
                $userData['nip'] = $guru->nip;
                $userData['jabatan'] = $guru->jabatan;
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Login berhasil',
            'data' => [
                'user' => $userData,
                'token' => $token,
                'expires_at' => $expiration->toISOString(),
                'tahun_ajaran' => $tahunAjaran ? [
                    'id' => $tahunAjaran->id,
                    'nama' => $tahunAjaran->nama,
                    'is_active' => $tahunAjaran->is_active,
                ] : null,
            ]
        ]);
    }

    /**
     * Logout user and revoke token
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Logout berhasil'
        ]);
    }

    /**
     * Get current authenticated user
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load('roles');

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $user->id,
                'username' => $user->username,
                'name' => $user->name,
                'role' => $user->role,
                'roles' => $user->roles->map(fn($r) => [
                    'id' => $r->id,
                    'name' => $r->name,
                    'display_name' => $r->display_name,
                ])->toArray(),
                'is_active' => $user->is_active,
                'last_login_at' => $user->last_login_at,
            ]
        ]);
    }

    /**
     * Change password
     */
    public function changePassword(Request $request): JsonResponse
    {
        $request->validate([
            'current_password' => 'required|string',
            'new_password' => 'required|string|min:8|confirmed',
        ]);

        $user = $request->user();

        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Password lama salah.'
            ], 400);
        }

        $user->password = Hash::make($request->new_password);
        $user->save();

        // Revoke all tokens except current
        $user->tokens()->where('id', '!=', $user->currentAccessToken()->id)->delete();

        return response()->json([
            'success' => true,
            'message' => 'Password berhasil diubah.'
        ]);
    }
}
