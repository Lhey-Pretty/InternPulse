<?php

namespace App\Services;

use App\Models\JwtToken;
use App\Models\User;
use Firebase\JWT\JWT;
use Illuminate\Support\Str;

class JwtTokenService
{
    /** @param array<int, string> $abilities */
    public function issue(User $user, array $abilities, string $authProvider = 'password'): string
    {
        $now = now()->timestamp;
        $expiresAt = $now + (int) config('jwt.ttl_seconds', 3600);
        $jti = (string) Str::uuid();

        JwtToken::create([
            'jti' => $jti,
            'user_id' => $user->id,
            'expires_at' => now()->setTimestamp($expiresAt + (int) config('jwt.refresh_grace_seconds', 604800)),
        ]);

        return JWT::encode([
            'iss' => config('jwt.issuer'),
            'sub' => $user->id,
            'iat' => $now,
            'exp' => $expiresAt,
            'jti' => $jti,
            'abilities' => array_values($abilities),
            'auth_provider' => $authProvider,
        ], (string) config('jwt.secret'), 'HS256');
    }

    public function revoke(string $jti): void
    {
        JwtToken::where('jti', $jti)->whereNull('revoked_at')->update(['revoked_at' => now()]);
    }
}
