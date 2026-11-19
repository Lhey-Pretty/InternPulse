<?php

use App\Models\User;
use App\Permissions\V1\Abilities;
use App\Services\JwtTokenService;

test('a regular user cannot edit another user by changing the URL id', function () {
    $signedInUser = User::factory()->create(['is_manager' => false]);
    $targetUser = User::factory()->create(['name' => 'Original Name']);
    $token = app(JwtTokenService::class)->issue($signedInUser, Abilities::getAbilities($signedInUser));

    $response = $this->withToken($token)->patchJson("/api/v1/users/{$targetUser->id}", [
        'data' => ['attributes' => ['name' => 'Changed by another user']],
    ]);

    $response->assertForbidden();
    expect($targetUser->fresh()->name)->toBe('Original Name');
});

test('a manager may edit another user through the authorized user endpoint', function () {
    $manager = User::factory()->create(['is_manager' => true]);
    $targetUser = User::factory()->create(['name' => 'Original Name']);
    $token = app(JwtTokenService::class)->issue($manager, Abilities::getAbilities($manager));

    $response = $this->withToken($token)->patchJson("/api/v1/users/{$targetUser->id}", [
        'data' => ['attributes' => ['name' => 'Updated by manager']],
    ]);

    $response->assertOk();
    expect($targetUser->fresh()->name)->toBe('Updated By Manager');
});

test('a non-admin cannot edit a user through the admin endpoint', function () {
    $signedInUser = User::factory()->create(['role' => 'student', 'is_manager' => false]);
    $targetUser = User::factory()->create(['name' => 'Original Name']);
    $token = app(JwtTokenService::class)->issue($signedInUser, Abilities::getAbilities($signedInUser));

    $response = $this->withToken($token)->patchJson("/api/v1/admin/users/{$targetUser->id}", [
        'name' => 'Changed by another user',
        'email' => $targetUser->email,
        'role' => $targetUser->role,
        'is_active' => true,
    ]);

    $response->assertForbidden();
    expect($targetUser->fresh()->name)->toBe('Original Name');
});

test('a manager cannot submit an unsupported role value', function () {
    $manager = User::factory()->create(['is_manager' => true]);
    $targetUser = User::factory()->create(['role' => 'student']);
    $token = app(JwtTokenService::class)->issue($manager, Abilities::getAbilities($manager));

    $response = $this->withToken($token)->patchJson("/api/v1/users/{$targetUser->id}", [
        'data' => ['attributes' => ['role' => 'superadmin']],
    ]);

    $response->assertUnprocessable();
    expect($targetUser->fresh()->role)->toBe('student');
});
