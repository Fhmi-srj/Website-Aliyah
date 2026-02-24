<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laragear\WebAuthn\Contracts\WebAuthnAuthenticatable;
use Laragear\WebAuthn\WebAuthnAuthentication;
use Laragear\WebAuthn\WebAuthnData;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable implements WebAuthnAuthenticatable
{
    use HasApiTokens, HasFactory, Notifiable, WebAuthnAuthentication;

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'username',
        'name',
        'password',
        'role',
        'guru_id',
        'tahun_ajaran_id',
        'is_active',
        'last_login_at',
        'failed_login_attempts',
        'locked_until',
    ];

    /**
     * The attributes that should be hidden for serialization.
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * The attributes that should be cast.
     */
    protected $casts = [
        'password' => 'hashed',
        'is_active' => 'boolean',
        'last_login_at' => 'datetime',
        'locked_until' => 'datetime',
    ];

    /**
     * Override WebAuthn data to use username instead of email.
     * This app uses 'username' as the unique identifier, not 'email'.
     */
    public function webAuthnData(): WebAuthnData
    {
        return WebAuthnData::make($this->username, $this->name ?? $this->username);
    }

    /**
     * The roles that belong to this user.
     */
    public function roles()
    {
        return $this->belongsToMany(Role::class)->withTimestamps();
    }

    /**
     * Check if user has a specific role
     */
    public function hasRole(string $roleName): bool
    {
        return $this->roles()->where('name', $roleName)->exists();
    }

    /**
     * Check if user has any of the given roles
     */
    public function hasAnyRole(array $roleNames): bool
    {
        return $this->roles()->whereIn('name', $roleNames)->exists();
    }

    /**
     * Check if user has all of the given roles
     */
    public function hasAllRoles(array $roleNames): bool
    {
        return $this->roles()->whereIn('name', $roleNames)->count() === count($roleNames);
    }

    /**
     * Assign a role to the user
     */
    public function assignRole(string $roleName): void
    {
        $role = Role::findByName($roleName);
        if ($role && !$this->hasRole($roleName)) {
            $this->roles()->attach($role->id);
        }
    }

    /**
     * Remove a role from the user
     */
    public function removeRole(string $roleName): void
    {
        $role = Role::findByName($roleName);
        if ($role) {
            $this->roles()->detach($role->id);
        }
    }

    /**
     * Sync user roles (replace all roles with new ones)
     */
    public function syncRoles(array $roleNames): void
    {
        $roleIds = Role::whereIn('name', $roleNames)->pluck('id')->toArray();
        $this->roles()->sync($roleIds);
    }

    /**
     * Get all role names as array
     */
    public function getRoleNames(): array
    {
        return $this->roles()->pluck('name')->toArray();
    }

    /**
     * Get highest level role (for primary panel access)
     */
    public function getPrimaryRole(): ?Role
    {
        return $this->roles()->orderBy('level', 'desc')->first();
    }

    /**
     * Check if user is operator/super admin (legacy support + new system)
     */
    public function isSuperadmin(): bool
    {
        return $this->role === 'superadmin' || $this->hasRole('superadmin');
    }

    /**
     * Check if user is guru (legacy support + new system)
     */
    public function isGuru(): bool
    {
        return $this->role === 'guru' || $this->hasRole('guru');
    }

    /**
     * Check if user has admin-level access
     */
    public function isAdmin(): bool
    {
        return $this->hasAnyRole(['superadmin', 'kepala_madrasah', 'waka_kurikulum', 'waka_kesiswaan']);
    }

    /**
     * Check if account is locked
     */
    public function isLocked(): bool
    {
        return $this->locked_until && $this->locked_until->isFuture();
    }

    /**
     * Get related guru
     */
    public function guru()
    {
        return $this->belongsTo(Guru::class);
    }

    /**
     * Get related tahun ajaran preference
     */
    public function tahunAjaran()
    {
        return $this->belongsTo(TahunAjaran::class);
    }

    /**
     * Increment failed login attempts
     */
    public function incrementFailedAttempts(): void
    {
        $this->failed_login_attempts++;

        // Lock account after 5 failed attempts
        if ($this->failed_login_attempts >= 5) {
            $this->locked_until = now()->addMinutes(30);
        }

        $this->save();
    }

    /**
     * Reset failed login attempts
     */
    public function resetFailedAttempts(): void
    {
        $this->failed_login_attempts = 0;
        $this->locked_until = null;
        $this->last_login_at = now();
        $this->save();
    }
}

