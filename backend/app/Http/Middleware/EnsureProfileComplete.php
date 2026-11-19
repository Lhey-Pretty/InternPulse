<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureProfileComplete
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            return $next($request);
        }

        $profileRoutes = [
            'student' => 'student.profile.edit',
            'company' => 'company.profile.edit',
            'coordinator' => 'coordinator.profile.edit',
        ];

        $profileChecks = [
            'student' => fn () => $user->studentProfile !== null,
            'company' => fn () => $user->companyProfile !== null,
            'coordinator' => fn () => $user->coordinatorProfile !== null,
        ];

        if (isset($profileChecks[$user->role]) && ! $profileChecks[$user->role]()) {
            $targetRoute = $profileRoutes[$user->role];

            if ($request->routeIs($targetRoute)) {
                return $next($request);
            }

            return redirect()->route($targetRoute)
                ->with('info', 'Please complete your profile before continuing.');
        }

        return $next($request);
    }
}
