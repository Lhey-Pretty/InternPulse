<?php

test('API limits each IP address to 60 requests per minute', function () {
    for ($attempt = 1; $attempt <= 60; $attempt++) {
        $response = $this->postJson('/api/v1/auth/login', []);
        expect($response->status())->not->toBe(429);
    }

    $this->postJson('/api/v1/auth/login', [])->assertTooManyRequests();
});

test('authenticated users sharing an IP have separate API limits', function () {
    $users = collect([1, 2])->map(function () {
        $user = \App\Models\User::factory()->create();
        $token = app(\App\Services\JwtTokenService::class)->issue(
            $user,
            \App\Permissions\V1\Abilities::getAbilities($user),
        );

        return [$user, $token];
    });

    foreach ($users as [$user, $token]) {
        for ($attempt = 1; $attempt <= 60; $attempt++) {
            $this->withToken($token)->getJson('/api/v1/notifications')->assertOk();
        }
    }
});
