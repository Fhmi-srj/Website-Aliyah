<?php

namespace App\Http\Controllers\Api\Guru;

use App\Http\Controllers\Controller;
use App\Models\PushSubscription;
use Illuminate\Http\Request;

class PushNotificationController extends Controller
{
    /**
     * Return VAPID public key for client-side subscription
     */
    public function vapidKey()
    {
        return response()->json([
            'success' => true,
            'key' => config('services.webpush.vapid_public_key'),
        ]);
    }

    /**
     * Subscribe: save push subscription endpoint + keys + preferences
     */
    public function subscribe(Request $request)
    {
        $request->validate([
            'endpoint' => 'required|string',
            'keys.p256dh' => 'required|string',
            'keys.auth' => 'required|string',
            'preferences' => 'nullable|array',
        ]);

        $sub = PushSubscription::updateOrCreate(
            ['endpoint' => $request->endpoint],
            [
                'user_id' => $request->user()->id,
                'public_key' => $request->input('keys.p256dh'),
                'auth_token' => $request->input('keys.auth'),
                'preferences' => $request->preferences ?? [
                    'jadwal' => true,
                    'kegiatan' => true,
                    'rapat' => true,
                ],
            ]
        );

        return response()->json([
            'success' => true,
            'message' => 'Push subscription berhasil disimpan',
            'data' => $sub,
        ]);
    }

    /**
     * Unsubscribe: remove push subscription
     */
    public function unsubscribe(Request $request)
    {
        $request->validate([
            'endpoint' => 'required|string',
        ]);

        PushSubscription::where('endpoint', $request->endpoint)
            ->where('user_id', $request->user()->id)
            ->delete();

        return response()->json([
            'success' => true,
            'message' => 'Push subscription berhasil dihapus',
        ]);
    }

    /**
     * Update notification preferences (toggle jadwal/kegiatan/rapat)
     */
    public function updatePreferences(Request $request)
    {
        $request->validate([
            'endpoint' => 'required|string',
            'preferences' => 'required|array',
        ]);

        $sub = PushSubscription::where('endpoint', $request->endpoint)
            ->where('user_id', $request->user()->id)
            ->first();

        if (!$sub) {
            return response()->json([
                'success' => false,
                'message' => 'Subscription tidak ditemukan',
            ], 404);
        }

        $sub->update(['preferences' => $request->preferences]);

        return response()->json([
            'success' => true,
            'message' => 'Preferences berhasil diperbarui',
            'data' => $sub,
        ]);
    }

    /**
     * Get current subscription status for this device
     */
    public function status(Request $request)
    {
        $endpoint = $request->query('endpoint');

        if (!$endpoint) {
            // Return all subscriptions for this user
            $subs = PushSubscription::where('user_id', $request->user()->id)->get();
            return response()->json([
                'success' => true,
                'subscribed' => $subs->count() > 0,
                'subscriptions' => $subs->count(),
                'preferences' => $subs->first()?->preferences ?? [
                    'jadwal' => true,
                    'kegiatan' => true,
                    'rapat' => true,
                ],
            ]);
        }

        $sub = PushSubscription::where('endpoint', $endpoint)
            ->where('user_id', $request->user()->id)
            ->first();

        return response()->json([
            'success' => true,
            'subscribed' => !!$sub,
            'preferences' => $sub?->preferences ?? [
                'jadwal' => true,
                'kegiatan' => true,
                'rapat' => true,
            ],
        ]);
    }
}
