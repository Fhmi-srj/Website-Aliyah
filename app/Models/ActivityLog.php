<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;

class ActivityLog extends Model
{
    protected $fillable = [
        'user_id',
        'action',
        'model_type',
        'model_id',
        'description',
        'old_values',
        'new_values',
        'ip_address',
        'user_agent',
    ];

    protected $casts = [
        'old_values' => 'array',
        'new_values' => 'array',
    ];

    /**
     * Get the user who performed the action.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Log an activity.
     *
     * @param string $action - 'create', 'update', 'delete', 'restore', 'attendance'
     * @param Model|null $model - The model being affected
     * @param string $description - Human-readable description
     * @param array|null $oldValues - Previous values (for update/delete)
     * @param array|null $newValues - New values (for create/update)
     */
    public static function log(
        string $action,
        $model = null,
        string $description = '',
        ?array $oldValues = null,
        ?array $newValues = null
    ): self {
        $user = Auth::user();

        return self::create([
            'user_id' => $user ? $user->id : null,
            'action' => $action,
            'model_type' => $model ? class_basename($model) : null,
            'model_id' => $model ? $model->id ?? null : null,
            'description' => $description,
            'old_values' => $oldValues,
            'new_values' => $newValues,
            'ip_address' => Request::ip(),
            'user_agent' => Request::userAgent(),
        ]);
    }

    /**
     * Shortcut for logging create action.
     */
    public static function logCreate($model, string $description = null): self
    {
        $modelName = class_basename($model);
        $desc = $description ?? "Menambahkan {$modelName}";

        return self::log('create', $model, $desc, null, $model->toArray());
    }

    /**
     * Shortcut for logging update action.
     */
    public static function logUpdate($model, array $oldValues, string $description = null): self
    {
        $modelName = class_basename($model);
        $desc = $description ?? "Mengubah {$modelName}";

        return self::log('update', $model, $desc, $oldValues, $model->toArray());
    }

    /**
     * Shortcut for logging delete action.
     */
    public static function logDelete($model, string $description = null): self
    {
        $modelName = class_basename($model);
        $desc = $description ?? "Menghapus {$modelName}";

        return self::log('delete', $model, $desc, $model->toArray(), null);
    }

    /**
     * Get human-readable action label.
     */
    public function getActionLabelAttribute(): string
    {
        return match ($this->action) {
            'create' => 'Tambah',
            'update' => 'Edit',
            'delete' => 'Hapus',
            'restore' => 'Restore',
            'attendance' => 'Absensi',
            'login' => 'Login',
            'logout' => 'Logout',
            default => ucfirst($this->action),
        };
    }

    /**
     * Get action color for badge.
     */
    public function getActionColorAttribute(): string
    {
        return match ($this->action) {
            'create' => 'green',
            'update' => 'blue',
            'delete' => 'red',
            'restore' => 'purple',
            'attendance' => 'yellow',
            'login' => 'emerald',
            'logout' => 'gray',
            default => 'gray',
        };
    }

    /**
     * Check if this log entry can be restored.
     */
    public function canRestore(): bool
    {
        return $this->action === 'delete' && !empty($this->old_values);
    }

    /**
     * Restore the deleted record.
     */
    public function restoreRecord()
    {
        if (!$this->canRestore()) {
            throw new \Exception('This record cannot be restored.');
        }

        $modelClass = "App\\Models\\{$this->model_type}";

        if (!class_exists($modelClass)) {
            throw new \Exception("Model class {$modelClass} not found.");
        }

        // Create new record with old values
        $data = $this->old_values;
        unset($data['id']); // Remove ID to create new record
        unset($data['created_at']);
        unset($data['updated_at']);

        $newModel = $modelClass::create($data);

        // Log the restore action
        self::log('restore', $newModel, "Memulihkan {$this->model_type}: " . ($data['nama'] ?? $data['nama_kegiatan'] ?? $data['agenda_rapat'] ?? 'ID ' . $newModel->id));

        return $newModel;
    }
}
