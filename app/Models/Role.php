<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Role extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'display_name',
        'description',
        'level',
        'allowed_pages',
    ];

    protected $casts = [
        'allowed_pages' => 'json',
    ];

    /**
     * The users that belong to this role.
     */
    public function users()
    {
        return $this->belongsToMany(User::class)->withTimestamps();
    }

    /**
     * Check if this is the superadmin role
     */
    public function isSuperadmin(): bool
    {
        return $this->name === 'superadmin';
    }

    /**
     * Check if this role has full access (all pages)
     */
    public function hasFullAccess(): bool
    {
        return $this->allowed_pages === '*';
    }

    /**
     * Check if this role can access a specific admin page
     */
    public function canAccessPage(string $path): bool
    {
        $pages = $this->allowed_pages;

        if ($pages === '*')
            return true;
        if (!is_array($pages))
            return false;

        foreach ($pages as $p) {
            if ($path === $p || str_starts_with($path, $p . '/')) {
                return true;
            }
        }
        return false;
    }

    /**
     * Get role by name
     */
    public static function findByName(string $name): ?self
    {
        return static::where('name', $name)->first();
    }
}
