<?php

use App\Models\Notification;
use App\Models\User;
use App\Permissions\V1\Abilities;
use App\Services\JwtTokenService;

test('authenticated user can list notifications', function () {
    $user = User::factory()->create(['role' => 'student']);
    $token = app(JwtTokenService::class)->issue($user, Abilities::getAbilities($user));

    $response = $this->withToken($token)->getJson('/api/v1/notifications');

    $response->assertOk()->assertJsonStructure(['data' => ['notifications', 'unread_count']]);
});

test('user can mark a notification as read', function () {
    $user = User::factory()->create(['role' => 'student']);
    $notification = Notification::create([
        'user_id' => $user->id,
        'type' => 'system',
        'title' => 'Test Notification',
        'message' => 'This is a test notification message.',
        'is_read' => false,
    ]);

    $token = app(JwtTokenService::class)->issue($user, Abilities::getAbilities($user));

    $this->withToken($token)->patchJson("/api/v1/notifications/{$notification->id}/read")->assertOk();

    expect($notification->fresh()->is_read)->toBeTrue();
});
