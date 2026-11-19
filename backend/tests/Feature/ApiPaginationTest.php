<?php

test('API pagination defaults to 10 records per page', function () {
    $this->getJson('/api/v1/internships')
        ->assertOk()
        ->assertJsonPath('meta.per_page', 10);
});

test('application listing applies query filters without a builder method error', function () {
    $user = \App\Models\User::factory()->create(['role' => 'coordinator']);
    $token = app(\App\Services\JwtTokenService::class)->issue(
        $user,
        \App\Permissions\V1\Abilities::getAbilities($user),
    );

    $this->withToken($token)->getJson('/api/v1/applications?status=pending')
        ->assertOk()
        ->assertJsonPath('data.per_page', 10);
});
