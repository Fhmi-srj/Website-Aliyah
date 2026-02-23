<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SupervisiQuestion extends Model
{
    protected $table = 'supervisi_questions';

    protected $fillable = [
        'bagian',
        'key',
        'label',
        'description',
        'sort_order',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];

    /**
     * Scope: only active questions
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope: filter by bagian
     */
    public function scopeBagian($query, string $bagian)
    {
        return $query->where('bagian', $bagian);
    }

    /**
     * Get all active questions grouped by bagian, ordered by sort_order
     */
    public static function getGrouped()
    {
        return static::active()
            ->orderBy('bagian')
            ->orderBy('sort_order')
            ->get()
            ->groupBy('bagian');
    }
}
