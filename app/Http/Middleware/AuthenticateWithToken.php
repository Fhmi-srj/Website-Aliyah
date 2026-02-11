<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;

class AuthenticateWithToken
{
    /**
     * Handle an incoming request.
     * Authenticate using bearer token from query parameter.
     */
    public function handle(Request $request, Closure $next)
    {
        $token = $request->query('token');

        if (!$token) {
            return response()->view('print.unauthorized', [], 401);
        }

        // Find the personal access token
        $accessToken = PersonalAccessToken::findToken($token);

        if (!$accessToken) {
            return response()->view('print.unauthorized', [], 401);
        }

        // Check if token is expired
        if ($accessToken->expires_at && $accessToken->expires_at->isPast()) {
            return response()->view('print.unauthorized', [], 401);
        }

        // Get the user associated with the token
        $user = $accessToken->tokenable;

        if (!$user) {
            return response()->view('print.unauthorized', [], 401);
        }

        // Set the user on the request
        $request->setUserResolver(function () use ($user) {
            return $user;
        });

        return $next($request);
    }
}
