<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class RoleController extends Controller
{
    /**
     * Get all roles
     */
    public function index()
    {
        try {
            $roles = Role::withCount('users')
                ->orderBy('level', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $roles
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal mengambil data role: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get all users for role assignment
     */
    public function getAllUsers()
    {
        try {
            $users = User::with('roles:id,name,display_name')
                ->select('id', 'name', 'username', 'is_active')
                ->orderBy('name')
                ->get()
                ->map(function ($user) {
                    // Get guru_id for wali kelas assignment
                    $guru = \App\Models\Guru::where('user_id', $user->id)->first();
                    $user->guru_id = $guru?->id;
                    return $user;
                });

            return response()->json([
                'success' => true,
                'data' => $users
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal mengambil data user: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get single role
     */
    public function show($id)
    {
        try {
            $role = Role::with('users:id,name,username')->findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => $role
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Role tidak ditemukan'
            ], 404);
        }
    }

    /**
     * Create new role
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:50|unique:roles,name|regex:/^[a-z_]+$/',
            'display_name' => 'required|string|max:100',
            'description' => 'nullable|string',
            'level' => 'nullable|integer|min:0|max:100',
        ], [
            'name.regex' => 'Nama role hanya boleh huruf kecil dan underscore',
            'name.unique' => 'Nama role sudah digunakan',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $role = Role::create([
                'name' => $request->name,
                'display_name' => $request->display_name,
                'description' => $request->description,
                'level' => $request->level ?? 0,
                'allowed_pages' => $request->allowed_pages ?? [],
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Role berhasil dibuat',
                'data' => $role
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal membuat role: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update role
     */
    public function update(Request $request, $id)
    {
        try {
            $role = Role::findOrFail($id);

            // Prevent editing core roles name
            $coreRoles = ['superadmin', 'guru'];
            if (in_array($role->name, $coreRoles) && $request->name !== $role->name) {
                return response()->json([
                    'success' => false,
                    'message' => 'Tidak dapat mengubah nama role inti'
                ], 403);
            }

            $validator = Validator::make($request->all(), [
                'name' => 'required|string|max:50|regex:/^[a-z_]+$/|unique:roles,name,' . $id,
                'display_name' => 'required|string|max:100',
                'description' => 'nullable|string',
                'level' => 'nullable|integer|min:0|max:100',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validasi gagal',
                    'errors' => $validator->errors()
                ], 422);
            }

            $updateData = [
                'name' => $request->name,
                'display_name' => $request->display_name,
                'description' => $request->description,
                'level' => $request->level ?? $role->level,
            ];

            if ($request->has('allowed_pages')) {
                $updateData['allowed_pages'] = $request->allowed_pages;
            }

            $role->update($updateData);

            return response()->json([
                'success' => true,
                'message' => 'Role berhasil diperbarui',
                'data' => $role
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal memperbarui role: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update allowed pages for a role
     */
    public function updatePages(Request $request, $id)
    {
        try {
            $role = Role::findOrFail($id);

            // Prevent editing superadmin pages
            if ($role->name === 'superadmin') {
                return response()->json([
                    'success' => false,
                    'message' => 'Tidak dapat mengubah akses halaman superadmin'
                ], 403);
            }

            $validator = Validator::make($request->all(), [
                'allowed_pages' => 'required',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validasi gagal',
                    'errors' => $validator->errors()
                ], 422);
            }

            $role->update([
                'allowed_pages' => $request->allowed_pages,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Akses halaman berhasil diperbarui',
                'data' => $role
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal memperbarui akses halaman: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete role
     */
    public function destroy($id)
    {
        try {
            $role = Role::findOrFail($id);

            // Prevent deleting core roles
            $coreRoles = ['superadmin', 'guru', 'kepala_madrasah'];
            if (in_array($role->name, $coreRoles)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Tidak dapat menghapus role inti'
                ], 403);
            }

            // Check if role is assigned to users
            if ($role->users()->count() > 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'Role masih digunakan oleh ' . $role->users()->count() . ' user'
                ], 400);
            }

            $role->delete();

            return response()->json([
                'success' => true,
                'message' => 'Role berhasil dihapus'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal menghapus role: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get users by role
     */
    public function getUsers($id)
    {
        try {
            $role = Role::findOrFail($id);
            $users = $role->users()
                ->select('users.id', 'users.name', 'users.username', 'users.is_active')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $users
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal mengambil data user: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Assign role to user
     */
    public function assignToUser(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'user_id' => 'required|exists:users,id',
            'role_id' => 'required|exists:roles,id',
            'kelas_id' => 'nullable|exists:kelas,id', // For wali_kelas role
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $user = User::findOrFail($request->user_id);
            $role = Role::findOrFail($request->role_id);

            // Check if already assigned
            if ($user->hasRole($role->name)) {
                return response()->json([
                    'success' => false,
                    'message' => 'User sudah memiliki role ini'
                ], 400);
            }

            // Special handling for wali_kelas role
            if ($role->name === 'wali_kelas') {
                if (!$request->kelas_id) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Kelas harus dipilih untuk role Wali Kelas'
                    ], 422);
                }

                // Get guru from user
                $guru = \App\Models\Guru::where('user_id', $user->id)->first();
                if (!$guru) {
                    return response()->json([
                        'success' => false,
                        'message' => 'User tidak terhubung dengan data guru'
                    ], 400);
                }

                // Check if kelas already has wali kelas
                $kelas = \App\Models\Kelas::findOrFail($request->kelas_id);
                if ($kelas->wali_kelas_id && $kelas->wali_kelas_id !== $guru->id) {
                    $existingWali = $kelas->waliKelas;
                    return response()->json([
                        'success' => false,
                        'message' => "Kelas {$kelas->nama_kelas} sudah memiliki wali kelas: {$existingWali->nama}"
                    ], 400);
                }

                // Assign wali kelas to the class
                $kelas->update(['wali_kelas_id' => $guru->id]);
            }

            $user->roles()->attach($role->id);

            return response()->json([
                'success' => true,
                'message' => 'Role berhasil ditambahkan ke user'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal menambahkan role: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove role from user
     */
    public function removeFromUser(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'user_id' => 'required|exists:users,id',
            'role_id' => 'required|exists:roles,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $user = User::findOrFail($request->user_id);
            $role = Role::findOrFail($request->role_id);

            // Prevent removing last role
            if ($user->roles()->count() <= 1) {
                return response()->json([
                    'success' => false,
                    'message' => 'User harus memiliki minimal 1 role'
                ], 400);
            }

            // Special handling for wali_kelas role - remove from kelas
            if ($role->name === 'wali_kelas') {
                $guru = \App\Models\Guru::where('user_id', $user->id)->first();
                if ($guru) {
                    // Remove wali kelas dari semua kelas yang dipegang
                    \App\Models\Kelas::where('wali_kelas_id', $guru->id)->update(['wali_kelas_id' => null]);
                }
            }

            $user->roles()->detach($role->id);

            return response()->json([
                'success' => true,
                'message' => 'Role berhasil dihapus dari user'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal menghapus role: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Sync user roles (replace all)
     */
    public function syncUserRoles(Request $request, $userId)
    {
        $validator = Validator::make($request->all(), [
            'role_ids' => 'required|array|min:1',
            'role_ids.*' => 'exists:roles,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $user = User::findOrFail($userId);
            $user->roles()->sync($request->role_ids);

            return response()->json([
                'success' => true,
                'message' => 'Role user berhasil diperbarui',
                'data' => $user->load('roles')
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal memperbarui role: ' . $e->getMessage()
            ], 500);
        }
    }
}
