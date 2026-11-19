<?php

use App\Models\SystemSetting;
use App\Models\User;
use App\Permissions\V1\Abilities;
use App\Services\JwtTokenService;

test('students and companies can read the admin evaluation editing policy', function () {
    SystemSetting::set('evaluation_editing_enabled', '0');
    $user = User::factory()->create(['role' => 'student']);
    $token = app(JwtTokenService::class)->issue($user, Abilities::getAbilities($user));

    $this->withToken($token)->getJson('/api/v1/evaluation-policy')
        ->assertOk()
        ->assertJsonPath('data.editing_enabled', false);

    SystemSetting::set('evaluation_editing_enabled', '1');
    $this->withToken($token)->getJson('/api/v1/evaluation-policy')
        ->assertOk()
        ->assertJsonPath('data.editing_enabled', true);
});
