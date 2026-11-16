<?php

use App\Models\User;
use Illuminate\Support\Facades\Notification;

test('legacy login url redirects to the react app', function () {
    $this->get('/login')->assertRedirect(rtrim(config('app.frontend_url'), '/') . '/login');
});

test('user can log in with valid credentials', function () {
    $user = User::factory()->create([
        'role' => 'student',
        'is_active' => true,
    ]);

    $response = $this->postJson('/api/v1/auth/login', [
        'email' => $user->email,
        'password' => 'password',
    ]);

    $response->assertOk()->assertJsonStructure(['data' => ['user' => ['id', 'email', 'role'], 'token']]);
    expect($response->json('data.token'))->toBeString()->not->toBeEmpty();
});

test('inactive user cannot log in', function () {
    $user = User::factory()->inactive()->create();

    $response = $this->postJson('/api/v1/auth/login', [
        'email' => $user->email,
        'password' => 'password',
    ]);

    $response->assertStatus(403);
    expect($response->json('message'))->toContain('deactivated');
});

test('forgot password accepts a known email and sends a reset link', function () {
    Notification::fake();

    $user = User::factory()->create(['role' => 'student']);

    $this->postJson('/api/v1/auth/forgot-password', ['email' => $user->email])->assertOk();

    Notification::assertSentTo($user, Illuminate\Auth\Notifications\ResetPassword::class);
});
