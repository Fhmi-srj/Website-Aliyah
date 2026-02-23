<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PushSubscription extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'endpoint',
        'public_key',
        'auth_token',
        'preferences',
    ];

    protected $casts = [
        'preferences' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Check if a specific notification type is enabled
     */
    public function isEnabled(string $type): bool
    {
        $prefs = $this->preferences ?? ['jadwal' => true, 'kegiatan' => true, 'rapat' => true];
        return $prefs[$type] ?? true;
    }

    /**
     * Get subscriptions for a specific user that have a type enabled
     */
    public static function getEnabledForUser(int $userId, string $type)
    {
        return static::where('user_id', $userId)
            ->get()
            ->filter(fn($sub) => $sub->isEnabled($type));
    }

    /**
     * Get all subscriptions that have a type enabled
     */
    public static function getAllEnabled(string $type)
    {
        return static::all()
            ->filter(fn($sub) => $sub->isEnabled($type));
    }
}
