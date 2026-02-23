<?php

namespace App\Http\Controllers\Api\Guru;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class GuruActivityLogController extends Controller
{
    /**
     * Get activity logs for the authenticated user only
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = ActivityLog::where('user_id', $user->id)
            ->orderBy('created_at', 'desc');

        // Filter by action
        if ($request->filled('action')) {
            $query->where('action', $request->action);
        }

        // Filter by date range
        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        $perPage = $request->input('per_page', 20);
        $logs = $query->paginate($perPage);

        // Transform the data
        $logs->getCollection()->transform(function ($log) {
            return [
                'id' => $log->id,
                'action' => $log->action,
                'action_label' => $log->action_label,
                'action_color' => $log->action_color,
                'model_type' => $log->model_type,
                'description' => $log->description,
                'ip_address' => $log->ip_address,
                'created_at' => $log->created_at->format('Y-m-d H:i:s'),
                'created_at_formatted' => $log->created_at->locale('id')->translatedFormat('d M Y, H:i'),
            ];
        });

        // Get distinct actions for this user (for filter dropdown)
        $actions = ActivityLog::where('user_id', $user->id)
            ->distinct()
            ->pluck('action')
            ->filter()
            ->values();

        return response()->json([
            'success' => true,
            'data' => $logs,
            'actions' => $actions,
        ]);
    }
}
