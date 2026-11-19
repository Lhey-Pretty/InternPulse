<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\LoginUserRequest;
use App\Http\Requests\Api\RegisterUserRequest;
use App\Models\AuditLog;
use App\Models\CompanyProfile;
use App\Models\SessionLog;
use App\Models\SystemSetting;
use App\Models\User;
use App\Models\StudentProfile;
use App\Models\Notification;
use App\Mail\StudentApprovalPending;
use Illuminate\Support\Facades\Mail;
use App\Support\AcademicPrograms;
use App\Permissions\V1\Abilities;
use App\Services\JwtTokenService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Throwable;

class AuthController extends Controller
{
    public function options(): JsonResponse
    {
        $googleClientId = (string) config('services.google.client_id', '');

        return $this->ok('Sign-in options retrieved.', [
            'password_enabled' => SystemSetting::get('password_auth_enabled', '1') === '1',
            'google_enabled' => SystemSetting::get('google_auth_enabled', '0') === '1' && $googleClientId !== '',
            'google_client_id' => SystemSetting::get('google_auth_enabled', '0') === '1' ? $googleClientId : null,
        ]);
    }

    /**
     * User Registration: creates the account and returns a token immediately.
     *
     * @unauthenticated
     * @group Authentication
     */
    public function register(RegisterUserRequest $request): JsonResponse
    {
        if (SystemSetting::get('password_auth_enabled', '1') !== '1') {
            return $this->error('Email and password registration is currently disabled.', 403);
        }

        $validated = $request->validated();

        if (($validated['account_type'] ?? 'student') === 'company') {
            $user = User::create([
                'name' => $validated['contact_person'],
                'email' => $validated['email'],
                'password' => Hash::make($validated['password']),
                'password_changed_at' => now(),
                'role' => 'company',
                'is_active' => false,
            ]);

            CompanyProfile::create([
                'user_id' => $user->id,
                'company_name' => $validated['company_name'],
                'industry' => $validated['industry'] ?? null,
                'description' => $validated['description'] ?? null,
                'address' => $validated['address'],
                'website' => $validated['website'] ?? null,
                'contact_person' => $validated['contact_person'],
                'contact_phone' => $validated['contact_phone'],
                'contact_email' => $validated['email'],
                'verification_status' => 'pending',
            ]);

            AuditLog::record('auth.register', $user, ['role' => 'company', 'verification_status' => 'pending']);

            return $this->success(
                'Company account submitted for administrator review.',
                ['pending_approval' => true],
                202,
            );
        }

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'password_changed_at' => now(),
            'role' => 'student',
            'is_active' => false,
        ]);

        $program = $validated['program'];
        $profile = StudentProfile::create([
            'user_id' => $user->id,
            'first_name' => Str::before($validated['name'], ' '),
            'last_name' => Str::after($validated['name'], ' '),
            'course' => AcademicPrograms::PROGRAMS[$program][0],
            'program' => $program,
            'school_name' => 'Mindoro State University',
        ]);
        try {
            Mail::to($user->email)->send(new StudentApprovalPending($user->name, $program));
        } catch (Throwable $exception) {
            report($exception);
        }
        $coordinators = User::where('role', 'coordinator')->where('is_active', true)
            ->whereHas('coordinatorProfile', fn ($query) => $query->where('program', $program))->get();
        foreach ($coordinators as $coordinator) {
            Notification::send($coordinator->id, 'student_approval', 'Student account needs approval',
                "{$user->name} registered for {$program} and is awaiting your approval.", ['student_profile_id' => $profile->id]);
        }

        AuditLog::record('auth.register', $user, ['role' => $user->role, 'program' => $program, 'approval_status' => 'pending']);
        return $this->success('Student account submitted for coordinator approval.', ['pending_approval' => true], 202);
    }

    /**
     * User Login: checks credentials and returns a token when correct.
     *
     * @unauthenticated
     * @group Authentication
     */
    public function login(LoginUserRequest $request): JsonResponse
    {
        if (SystemSetting::get('password_auth_enabled', '1') !== '1') {
            return $this->error('Email and password sign-in is currently disabled.', 403);
        }

        $credentials = $request->validated();

        $user = User::where('email', $credentials['email'])->first();

        $maxAttempts = max(1, (int) SystemSetting::get('login_max_attempts', 3));
        $cooldownMinutes = max(1, (int) SystemSetting::get('login_cooldown_minutes', 60));

        if ($user?->login_locked_until && $user->login_locked_until->isFuture()) {
            $minutes = max(1, now()->diffInMinutes($user->login_locked_until));
            return response()->json([
                'message' => "Too many failed attempts. Try again in about {$minutes} minute(s).",
                'status' => 423,
                'data' => ['locked_until' => $user->login_locked_until->toIso8601String()],
            ], 423);
        }

        if ($user?->login_locked_until && $user->login_locked_until->isPast()) {
            $user->forceFill(['login_failed_attempts' => 0, 'login_locked_until' => null])->save();
        }

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            SessionLog::record('failed_login', null, $credentials['email']);

            if ($user) {
                $user->increment('login_failed_attempts');
                $user->refresh();

                if ($user->login_failed_attempts >= $maxAttempts) {
                    $lockedUntil = now()->addMinutes($cooldownMinutes);
                    $user->forceFill(['login_locked_until' => $lockedUntil])->save();
                    \App\Models\Notification::send(
                        $user->id,
                        'security',
                        'Sign-in temporarily locked',
                        "There were {$maxAttempts} unsuccessful sign-in attempts on your account. You can try again after {$lockedUntil->format('M j, Y g:i A')}.",
                        ['locked_until' => $lockedUntil->toIso8601String()],
                    );

                    return response()->json([
                        'message' => "Too many failed attempts. Try again in {$cooldownMinutes} minute(s).",
                        'status' => 423,
                        'data' => ['locked_until' => $lockedUntil->toIso8601String()],
                    ], 423);
                }
            }

            return $this->error('These credentials do not match our records.', 401);
        }

        $user->forceFill(['login_failed_attempts' => 0, 'login_locked_until' => null])->save();

        return $this->completeLogin($user);
    }

    public function googleLogin(Request $request): JsonResponse
    {
        if (SystemSetting::get('google_auth_enabled', '0') !== '1' || ! config('services.google.client_id')) {
            return $this->error('Google sign-in is currently disabled.', 403);
        }

        $validated = $request->validate(['credential' => ['required', 'string', 'max:8192']]);

        try {
            $claims = app(\App\Services\GoogleIdTokenVerifier::class)->verify($validated['credential']);
        } catch (Throwable $exception) {
            report($exception);
            return $this->error('Google sign-in could not be verified. Please try again.', 401);
        }

        $user = User::whereRaw('LOWER(email) = ?', [strtolower($claims['email'])])->first();
        if (! $user) {
            return $this->error('No existing account is linked to this Google email.', 403);
        }

        return $this->completeLogin($user, 'google');
    }

    private function completeLogin(User $user, string $authProvider = 'password'): JsonResponse
    {
        if (! $user->is_active) {
            if ($user->isStudent() && $user->studentProfile) {
                return $this->error('Your student account is awaiting coordinator approval.', 403);
            }
            if ($user->isCompany() && $user->companyProfile?->verification_status === 'pending') {
                return $this->error('Your company account is awaiting administrator approval.', 403);
            }

            return $this->error('Your account has been deactivated.', 403);
        }

        if (! $user->hasActiveAccess()) {
            return $this->error('Your account access has expired or is not currently active.', 403);
        }

        app(\App\Services\PasswordExpiryNotifier::class)->notify($user);

        $token = app(JwtTokenService::class)->issue($user, Abilities::getAbilities($user), $authProvider);
        SessionLog::record('login', $user);
        if ($authProvider === 'google') {
            AuditLog::record('auth.login.google', $user, ['provider' => 'google']);
        }

        $user->load(['studentProfile', 'companyProfile', 'coordinatorProfile']);
        $user->setAttribute('password_change_required', $user->must_change_password
            || ($authProvider === 'password' && $user->passwordChangeRequired()));
        $user->setAttribute('auth_provider', $authProvider);

        return $this->ok('Login successful.', array_merge([
            'user' => $user,
        ], $this->formatToken($token)));
    }

    /**
     * Get the authenticated user with profiles.
     *
     * @authenticated
     * @group Authentication
     */
    public function me(Request $request): JsonResponse
    {
        /** @var User|null $user */
        $user = $request->user();

        if (! $user) {
            return $this->error('Unauthenticated.', 401);
        }

        $user->load(['studentProfile', 'companyProfile', 'coordinatorProfile']);
        $payload = $request->attributes->get('jwt_payload', []);
        $user->setAttribute(
            'password_change_required',
            $user->must_change_password
                || (($payload['auth_provider'] ?? 'password') === 'password' && $user->passwordChangeRequired()),
        );
        $user->setAttribute('auth_provider', $payload['auth_provider'] ?? 'password');

        return $this->ok('User retrieved.', [
            'user' => $user,
            'unread_notifications_count' => $user->unreadNotificationsCount(),
        ]);
    }

    /**
     * Refresh the current token: revokes the old token and returns a fresh one.
     *
     * @authenticated
     * @group Authentication
     */
    public function refresh(Request $request): JsonResponse
    {
        /** @var User|null $user */
        $user = $request->user();

        if (! $user) {
            return $this->error('Unauthenticated.', 401);
        }

        $payload = $request->attributes->get('jwt_payload', []);
        app(JwtTokenService::class)->revoke((string) ($payload['jti'] ?? ''));

        $newToken = app(JwtTokenService::class)->issue(
            $user,
            Abilities::getAbilities($user),
            (string) ($payload['auth_provider'] ?? 'password'),
        );

        return $this->ok('Token refreshed.', $this->formatToken($newToken));
    }

    /**
     * Logout: revokes the current access token.
     *
     * @authenticated
     * @group Authentication
     */
    public function logout(Request $request): JsonResponse
    {
        /** @var User|null $user */
        $user = $request->user();

        if ($user) {
            SessionLog::closeCurrent($user);
            SessionLog::record('logout', $user);
            $payload = $request->attributes->get('jwt_payload', []);
            app(JwtTokenService::class)->revoke((string) ($payload['jti'] ?? ''));
        }

        return $this->ok('Successfully logged out.', null);
    }

    /**
     * Send a password reset link to the given email address.
     *
     * @unauthenticated
     * @group Authentication
     */
    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate(['email' => ['required', 'email']]);

        $status = Password::sendResetLink($request->only('email'));

        if ($status === Password::RESET_LINK_SENT) {
            return $this->ok('Password reset link sent. Check your email.');
        }

        return $this->error(__($status), 422);
    }

    /**
     * Reset the user's password using the emailed token.
     *
     * @unauthenticated
     * @group Authentication
     */
    public function resetPassword(Request $request): JsonResponse
    {
        $request->validate([
            'token' => ['required'],
            'email' => ['required', 'email'],
            'password' => ['required', 'confirmed', PasswordRule::defaults()],
        ]);

        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function ($user, string $password) {
                $user->forceFill([
                    'password' => Hash::make($password),
                    'password_changed_at' => now(),
                    'remember_token' => Str::random(60),
                    'login_failed_attempts' => 0,
                    'login_locked_until' => null,
                    'must_change_password' => false,
                ])->save();

                \App\Models\Notification::send(
                    $user->id,
                    'security',
                    'Password reset',
                    'Your account password was reset successfully. If you did not request this, contact an administrator.',
                );

                event(new PasswordReset($user));
            }
        );

        if ($status === Password::PASSWORD_RESET) {
            return $this->ok('Password has been reset. You can now sign in.');
        }

        return $this->error(__($status), 422);
    }

    /**
     * Change the authenticated user's password.
     *
     * @authenticated
     * @group Authentication
     */
    public function changePassword(Request $request): JsonResponse
    {
        $authProvider = $request->attributes->get('jwt_payload')['auth_provider'] ?? 'password';
        $validated = $request->validate([
            'current_password' => [$authProvider === 'google' ? 'nullable' : 'required', 'string'],
            'password' => ['required', 'confirmed', PasswordRule::defaults()],
        ]);

        $user = $request->user();

        if ($authProvider !== 'google' && ! Hash::check($validated['current_password'], $user->password)) {
            return $this->error('The current password is incorrect.', 422);
        }

        $user->forceFill([
            'password' => Hash::make($validated['password']),
            'password_changed_at' => now(),
            'must_change_password' => false,
        ])->save();
        \App\Models\Notification::send(
            $user->id,
            'security',
            'Password changed',
            'Your account password was changed successfully.',
        );

        return $this->ok('Password changed successfully.');
    }

    public function firstLoginSetup(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_if(! $user->isCoordinator() || ! $user->must_change_password, 403);
        $rules = [
            'email' => ['required', 'email', 'max:255', 'unique:users,email,'.$user->id],
            'current_password' => ['required', 'string'],
            'code' => ['nullable', 'digits:6'],
        ];
        if ($request->filled('code')) {
            $rules['password'] = ['required', 'confirmed', PasswordRule::defaults()];
        }
        $validated = $request->validate($rules);
        if (! Hash::check($validated['current_password'], $user->password)) {
            return $this->error('The current password is incorrect.', 422);
        }
        $cacheKey = 'coordinator-first-login:'.$user->id.':'.sha1(strtolower($validated['email']));
        if (empty($validated['code'])) {
            $code = (string) random_int(100000, 999999);
            Cache::put($cacheKey, ['code' => Hash::make($code)], now()->addMinutes(10));
            Mail::raw("Your InternPulse email verification code is {$code}. It expires in 10 minutes.", fn ($message) => $message->to($validated['email'])->subject('Verify your new InternPulse email'));
            return $this->ok('Verification code sent to your new email.');
        }
        $pending = Cache::get($cacheKey);
        if (! $pending || ! Hash::check($validated['code'], $pending['code'])) {
            return $this->error('Verification code is invalid or expired. Request a new code and try again.', 422);
        }
        $previousEmail = $user->email;
        $user->forceFill(['email' => strtolower($validated['email']), 'password' => Hash::make($validated['password']), 'password_changed_at' => now(), 'must_change_password' => false, 'email_verified_at' => now()])->save();
        Cache::forget($cacheKey);
        AuditLog::record('coordinator.first_login_setup', $user, ['previous_email' => $previousEmail]);
        return $this->ok('Email verified and account setup completed.', ['email' => $user->email]);
    }

    /**
     * Change the authenticated user's sign-in email after password confirmation.
     */
    public function changeEmail(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email', 'max:255', 'unique:users,email,' . $request->user()->id],
            'current_password' => ['required', 'string'],
        ]);

        $user = $request->user();
        $authProvider = $request->attributes->get('jwt_payload')['auth_provider'] ?? 'password';
        if ($authProvider === 'google') {
            return $this->error('Change the email on your Google account, then sign in again.', 422);
        }

        if (! Hash::check($validated['current_password'], $user->password)) {
            return $this->error('The current password is incorrect.', 422);
        }

        $previousEmail = $user->email;
        $user->forceFill(['email' => strtolower($validated['email'])])->save();

        \App\Models\Notification::send(
            $user->id,
            'security',
            'Account email changed',
            'Your sign-in email was changed from ' . $previousEmail . ' to ' . $user->email . '.',
        );

        return $this->ok('Email updated successfully.', ['email' => $user->email]);
    }

    /**
     * Helper to map and format token response consistently.
     *
     * @return array<string, mixed>
     */
    protected function formatToken(string $token): array
    {
        return [
            'token' => $token,
            'access_token' => $token,
            'token_type' => 'bearer',
            'expires_in' => 3600,
        ];
    }
}
