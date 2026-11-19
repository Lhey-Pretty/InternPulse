<?php

namespace App\Providers;

use App\Models\InternshipPosting;
use App\Models\User;
use App\Policies\V1\InternshipPostingPolicy;
use App\Policies\V1\UserPolicy;
use Illuminate\Pagination\Paginator;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\ServiceProvider;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        RateLimiter::for('api', function (Request $request) {
            $user = $request->user();

            return Limit::perMinute(60)->by($user ? 'user:'.$user->getAuthIdentifier() : 'ip:'.$request->ip());
        });

        // Clean compact Tailwind pagination globally
        Paginator::useTailwind();
        Paginator::defaultView('vendor.pagination.tailwind');
        // Global Strict Password Security Rules
        // Min 8 chars, uppercase, lowercase, numbers, and symbols/special chars
        Password::defaults(function () {
            return Password::min(8)
                ->letters()
                ->mixedCase()
                ->numbers()
                ->symbols();
        });

        // Password reset emails link to the React SPA, not the Blade views
        ResetPassword::createUrlUsing(function ($user, string $token) {
            $frontend = rtrim((string) config('app.frontend_url', 'http://localhost:5173'), '/');

            return $frontend.'/reset-password?token='.$token.'&email='.urlencode($user->email);
        });

        // InternshipPosting models are protected by InternshipPostingPolicy
        Gate::policy(InternshipPosting::class, InternshipPostingPolicy::class);

        // User models are protected by UserPolicy
        Gate::policy(User::class, UserPolicy::class);
    }
}
