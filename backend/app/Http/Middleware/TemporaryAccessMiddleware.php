<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class TemporaryAccessMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            return $next($request);
        }

        // Only check temporary accounts
        if (! $user->is_temporary) {
            return $next($request);
        }

        // Access period not started yet
        if ($user->accessNotStarted()) {
            Auth::logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return redirect()->route('login')
                ->with('error', 'Your account access has not started yet. Please contact the administrator.');
        }

        // Access period expired — log out but DO NOT delete any data
        if ($user->accessExpired()) {
            Auth::logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return redirect()->route('login')
                ->with('error', 'Your temporary access has expired. Your internship records have been preserved. Please contact the administrator if you need further access.');
        }

        return $next($request);
    }
}
