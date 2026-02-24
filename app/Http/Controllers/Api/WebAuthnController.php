<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Guru;
use App\Models\TahunAjaran;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Contracts\Support\Responsable;
use Laragear\WebAuthn\Http\Requests\AssertedRequest;
use Laragear\WebAuthn\Http\Requests\AssertionRequest;
use Laragear\WebAuthn\Http\Requests\AttestationRequest;
use Laragear\WebAuthn\Http\Requests\AttestedRequest;

class WebAuthnController extends Controller
{
    // ==============================
    // REGISTRATION (authenticated)
    // ==============================

    /**
     * Generate attestation options for registering a new credential.
     */
    public function registerOptions(AttestationRequest $request): Responsable
    {
        // userless() = resident key: credential disimpan di device agar bisa login tanpa username
        return $request->fastRegistration()->userless()->toCreate();
    }

    /**
     * Verify and store a new WebAuthn credential.
     */
    public function register(AttestedRequest $request): JsonResponse
    {
        $request->save();

        return response()->json([
            'success' => true,
            'message' => 'Sidik jari berhasil didaftarkan!',
        ]);
    }

    /**
     * List all WebAuthn credentials for the authenticated user.
     */
    public function credentials(Request $request): JsonResponse
    {
        $credentials = $request->user()
            ->webAuthnCredentials()
            ->select(['id', 'alias', 'is_enabled', 'created_at', 'updated_at'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn($cred) => [
                'id' => base64_encode($cred->id),
                'alias' => $cred->alias,
                'is_enabled' => $cred->is_enabled,
                'created_at' => $cred->created_at?->diffForHumans(),
                'registered_at' => $cred->created_at?->format('d M Y H:i'),
            ]);

        return response()->json([
            'success' => true,
            'data' => $credentials,
        ]);
    }

    /**
     * Delete a WebAuthn credential.
     */
    public function deleteCredential(Request $request, string $credentialId): JsonResponse
    {
        $id = base64_decode($credentialId);

        $deleted = $request->user()
            ->webAuthnCredentials()
            ->where('id', $id)
            ->delete();

        if (!$deleted) {
            return response()->json([
                'success' => false,
                'message' => 'Credential tidak ditemukan.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Sidik jari berhasil dihapus.',
        ]);
    }

    // ==============================
    // LOGIN (public, no auth)
    // ==============================

    /**
     * Generate assertion options (challenge) for login.
     * Accepts username to find the user and their registered credentials.
     */
    public function loginOptions(AssertionRequest $request): Responsable
    {
        // toVerify(null) = discoverable credential: browser tampilkan semua credential terdaftar
        // tanpa perlu username - user langsung scan jari
        return $request->toVerify(null);
    }

    /**
     * Verify the assertion and issue a Sanctum token.
     */
    public function login(AssertedRequest $request): JsonResponse
    {
        // Validate extra fields we need
        $request->validate([
            'tahun_ajaran_id' => 'required|exists:tahun_ajaran,id',
        ]);

        // Use the web guard to validate the assertion
        $authenticatable = $request->login();

        if (!$authenticatable) {
            return response()->json([
                'success' => false,
                'message' => 'Autentikasi sidik jari gagal. Coba lagi.',
            ], 401);
        }

        /** @var User $user */
        $user = $authenticatable;

        // Check if account is active
        if (!$user->is_active) {
            return response()->json([
                'success' => false,
                'message' => 'Akun tidak aktif. Hubungi administrator.',
            ], 403);
        }

        // Check if account is locked
        if ($user->isLocked()) {
            $minutes = $user->locked_until->diffInMinutes(now());
            return response()->json([
                'success' => false,
                'message' => "Akun terkunci. Coba lagi dalam {$minutes} menit.",
            ], 423);
        }

        // Save selected tahun_ajaran
        $tahunAjaranId = $request->input('tahun_ajaran_id');
        $user->tahun_ajaran_id = $tahunAjaranId;
        $user->save();

        $tahunAjaran = TahunAjaran::find($tahunAjaranId);

        // Reset failed attempts
        $user->resetFailedAttempts();

        // Revoke old tokens and create new one
        $user->tokens()->delete();

        $remember = $request->hasRemember();
        $expiration = $remember ? now()->addDays(30) : now()->addHours(2);
        $token = $user->createToken('auth-token', ['*'], $expiration)->plainTextToken;

        // Build user data (same as AuthController)
        $userData = [
            'id' => $user->id,
            'username' => $user->username,
            'name' => $user->name,
            'role' => $user->role,
            'roles' => $user->roles->map(fn($r) => [
                'id' => $r->id,
                'name' => $r->name,
                'display_name' => $r->display_name,
                'allowed_pages' => $r->allowed_pages,
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

        // Log login activity
        ActivityLog::create([
            'user_id' => $user->id,
            'action' => 'login',
            'model_type' => 'User',
            'model_id' => $user->id,
            'description' => "Login via sidik jari: {$user->name} ({$user->role})",
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

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
            ],
        ]);
    }

    /**
     * Check if a user has WebAuthn credentials registered.
     * Used to show/hide the fingerprint login button.
     */
    public function hasCredentials(Request $request): JsonResponse
    {
        $request->validate(['username' => 'required|string']);

        $user = User::where('username', $request->username)->first();

        if (!$user) {
            // Also check guru table
            $guru = Guru::where(function ($q) use ($request) {
                $q->where('username', $request->username)
                    ->orWhere('email', $request->username);
            })->where('status', 'Aktif')->first();

            if ($guru) {
                $user = User::where('guru_id', $guru->id)->first();
            }
        }

        $hasCredentials = $user
            ? $user->webAuthnCredentials()->whereEnabled()->exists()
            : false;

        return response()->json([
            'success' => true,
            'data' => ['has_credentials' => $hasCredentials],
        ]);
    }
}
