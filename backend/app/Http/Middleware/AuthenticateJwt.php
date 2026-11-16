<?php

namespace App\Http\Middleware;

use App\Models\JwtToken;
use App\Models\User;
use Closure;
use Firebase\JWT\ExpiredException;
use Firebase\JWT\Key;
use Firebase\JWT\JWT;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

class AuthenticateJwt
{
    public function handle(Request $request, Closure $next, string $mode = 'access'): Response
    {
        $token = $request->bearerToken();
        if (! $token || ! config('jwt.secret')) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $refreshMode = $mode === 'refresh';
        $previousLeeway = JWT::$leeway;

        try {
            if ($refreshMode) {
                JWT::$leeway = (int) config('jwt.refresh_grace_seconds', 604800);
            }

            $payload = (array) JWT::decode($token, new Key((string) config('jwt.secret'), 'HS256'));
        } catch (Throwable) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        } finally {
            JWT::$leeway = $previousLeeway;
        }

        if (($payload['iss'] ?? null) !== config('jwt.issuer') || empty($payload['sub']) || empty($payload['jti'])) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        if ($refreshMode && (int) ($payload['exp'] ?? 0) < now()->subSeconds((int) config('jwt.refresh_grace_seconds', 604800))->timestamp) {
            return response()->json(['message' => 'The refresh window has expired. Please sign in again.'], 401);
        }

        $tokenRecord = JwtToken::where('jti', $payload['jti'])
            ->where('user_id', $payload['sub'])
            ->whereNull('revoked_at')
            ->where('expires_at', '>', now())
            ->first();

        $user = User::find($payload['sub']);
        if (! $tokenRecord || ! $user || ! $user->is_active) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $passwordChangeAllowed = $request->is('api/v1/auth/change-password', 'api/v1/auth/logout', 'api/v1/auth/refresh');
        $authProvider = $payload['auth_provider'] ?? 'password';
        $mustChangePassword = $user->must_change_password
            || ($authProvider === 'password' && $user->passwordChangeRequired());
        if ($mustChangePassword && ! $passwordChangeAllowed) {
            return response()->json([
                'message' => 'Your password has expired. Change it before continuing.',
                'status' => 403,
                'password_change_required' => true,
            ], 403);
        }

        $tokenRecord->forceFill(['last_used_at' => now()])->save();
        $request->attributes->set('jwt_payload', $payload);
        $request->setUserResolver(fn () => $user);
        Auth::setUser($user);

        return $next($request);
    }
}
