<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BisyarohSetting extends Model
{
    use HasFactory;

    protected $table = 'bisyaroh_settings';

    protected $fillable = [
        'key',
        'value',
        'type',
        'category',
        'label',
        'sort_order',
    ];

    /**
     * Get a setting value by key
     */
    public static function getValue(string $key, $default = null)
    {
        $setting = self::where('key', $key)->first();

        if (!$setting) {
            return $default;
        }

        switch ($setting->type) {
            case 'integer':
                return (int) $setting->value;
            case 'boolean':
                return filter_var($setting->value, FILTER_VALIDATE_BOOLEAN);
            default:
                return $setting->value;
        }
    }

    /**
     * Get all settings grouped by category
     */
    public static function getAllGrouped()
    {
        return self::orderBy('sort_order')->get()->groupBy('category');
    }

    /**
     * Scope to filter by category
     */
    public function scopeCategory($query, $category)
    {
        return $query->where('category', $category);
    }
}
