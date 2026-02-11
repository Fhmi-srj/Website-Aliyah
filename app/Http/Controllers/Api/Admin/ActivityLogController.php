<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class ActivityLogController extends Controller
{
    /**
     * Get paginated activity logs with filters.
     */
    public function index(Request $request): JsonResponse
    {
        $query = ActivityLog::with('user:id,name')
            ->orderBy('created_at', 'desc');

        // Filter by action
        if ($request->filled('action')) {
            $query->where('action', $request->action);
        }

        // Filter by model type
        if ($request->filled('model_type')) {
            $query->where('model_type', $request->model_type);
        }

        // Filter by date range
        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        // Search by description
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('description', 'like', "%{$search}%")
                    ->orWhereHas('user', function ($uq) use ($search) {
                        $uq->where('name', 'like', "%{$search}%");
                    });
            });
        }

        $perPage = $request->input('per_page', 20);
        $logs = $query->paginate($perPage);

        // Transform the data
        $logs->getCollection()->transform(function ($log) {
            return [
                'id' => $log->id,
                'user_name' => $log->user?->name ?? 'System',
                'action' => $log->action,
                'action_label' => $log->action_label,
                'action_color' => $log->action_color,
                'model_type' => $log->model_type,
                'model_id' => $log->model_id,
                'description' => $log->description,
                'old_values' => $log->old_values,
                'new_values' => $log->new_values,
                'can_restore' => $log->canRestore(),
                'created_at' => $log->created_at->format('Y-m-d H:i:s'),
                'created_at_formatted' => $log->created_at->locale('id')->translatedFormat('d M Y, H:i'),
            ];
        });

        // Get distinct model types for filter dropdown
        $modelTypes = ActivityLog::distinct()->pluck('model_type')->filter()->values();

        return response()->json([
            'success' => true,
            'data' => $logs,
            'model_types' => $modelTypes,
        ]);
    }

    /**
     * Restore a deleted record.
     */
    public function restore(Request $request, $id): JsonResponse
    {
        $log = ActivityLog::findOrFail($id);

        if (!$log->canRestore()) {
            return response()->json([
                'success' => false,
                'message' => 'Record ini tidak dapat di-restore.',
            ], 400);
        }

        try {
            $restoredModel = $log->restoreRecord();

            return response()->json([
                'success' => true,
                'message' => 'Record berhasil di-restore.',
                'data' => $restoredModel,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal restore: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get activity log statistics.
     */
    public function stats(): JsonResponse
    {
        $today = now()->startOfDay();
        $thisWeek = now()->startOfWeek();
        $thisMonth = now()->startOfMonth();

        return response()->json([
            'success' => true,
            'data' => [
                'today' => ActivityLog::whereDate('created_at', $today)->count(),
                'this_week' => ActivityLog::where('created_at', '>=', $thisWeek)->count(),
                'this_month' => ActivityLog::where('created_at', '>=', $thisMonth)->count(),
                'total' => ActivityLog::count(),
                'by_action' => [
                    'create' => ActivityLog::where('action', 'create')->count(),
                    'update' => ActivityLog::where('action', 'update')->count(),
                    'delete' => ActivityLog::where('action', 'delete')->count(),
                    'restore' => ActivityLog::where('action', 'restore')->count(),
                ],
            ],
        ]);
    }
}
