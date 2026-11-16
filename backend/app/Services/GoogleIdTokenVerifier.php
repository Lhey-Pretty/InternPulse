<?php

namespace App\Services;

use Firebase\JWT\JWK;
use Firebase\JWT\JWT;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class GoogleIdTokenVerifier
{
    /** @return array<string, mixed> */
    public function verify(string $idToken): array
    {
        $jwks = Cache::remember('google.openid.jwks', 3600, function (): array {
            $response = Http::timeout(5)->get('https://www.googleapis.com/oauth2/v3/certs');
            if (! $response->successful()) {
                throw new RuntimeException('Google signing keys are unavailable.');
            }

            return $response->json();
        });

        $claims = (array) JWT::decode($idToken, JWK::parseKeySet($jwks, 'RS256'));
        $issuer = $claims['iss'] ?? null;
        $validIssuers = ['accounts.google.com', 'https://accounts.google.com'];

        if (! in_array($issuer, $validIssuers, true)
            || ($claims['aud'] ?? null) !== config('services.google.client_id')
            || empty($claims['email'])
            || ! filter_var($claims['email'], FILTER_VALIDATE_EMAIL)
            || ! in_array($claims['email_verified'] ?? false, [true, 'true'], true)) {
            throw new RuntimeException('Google identity token claims are invalid.');
        }

        return $claims;
    }
}
