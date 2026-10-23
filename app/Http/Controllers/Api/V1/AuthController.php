<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\LoginUserRequest;
use App\Http\Requests\Api\RegisterUserRequest;
use App\Models\User;
use App\Permissions\V1\Abilities;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\PersonalAccessToken;

class AuthController extends Controller
{
    /**
     * User Registration: creates the account and returns a token immediately.
     *
     * @unauthenticated
     * @group Authentication
     */
    public function register(RegisterUserRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $role = $validated['role'] ?? 'student';

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => $role,
            'is_active' => true,
        ]);

        $token = $user->createToken('auth_token', Abilities::getAbilities($user))->plainTextToken;

        return $this->ok('Registered successfully.', array_merge([
            'user' => $user,
        ], $this->formatToken($token)));
    }

    /**
     * User Login: checks credentials and returns a token when correct.
     *
     * @unauthenticated
     * @group Authentication
     */
    public function login(LoginUserRequest $request): JsonResponse
    {
        $credentials = $request->validated();

        $user = User::where('email', $credentials['email'])->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            return $this->error('These credentials do not match our records.', 401);
        }

        if (! $user->is_active) {
            return $this->error('Your account has been deactivated.', 403);
        }

        if (! $user->hasActiveAccess()) {
            return $this->error('Your account access has expired or is not currently active.', 403);
        }

        $token = $user->createToken('auth_token', Abilities::getAbilities($user))->plainTextToken;

        return $this->ok('Login successful.', array_merge([
            'user' => $user->load(['studentProfile', 'companyProfile', 'coordinatorProfile']),
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

        // Revoke current token safely
        $currentToken = $user->currentAccessToken();
        if ($currentToken instanceof PersonalAccessToken) {
            $currentToken->delete();
        }

        $newToken = $user->createToken('auth_token', Abilities::getAbilities($user))->plainTextToken;

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
            $currentToken = $user->currentAccessToken();
            if ($currentToken instanceof PersonalAccessToken) {
                $currentToken->delete();
            }
        }

        return $this->ok('Successfully logged out.', null);
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
