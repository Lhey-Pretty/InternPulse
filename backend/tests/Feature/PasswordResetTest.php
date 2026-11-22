<?php

use App\Models\Notification as AccountNotification;
use App\Models\User;
use App\Notifications\CustomResetPassword;
use Carbon\Carbon;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Notifications\SendQueuedNotifications;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Queue;

function passwordResetPayload(User $user, string $token, string $password = 'ChangedPassword123!'): array
{
    return ['email' => $user->email, 'token' => $token, 'password' => $password, 'password_confirmation' => $password];
}

test('forgot password queues the custom email with a usable broker token', function () {
    Queue::fake();
    $user = User::factory()->create();
    $this->postJson('/api/v1/auth/forgot-password', ['email' => $user->email])->assertOk();
    Queue::assertPushed(SendQueuedNotifications::class, function ($job) use ($user) {
        return $job->notification instanceof CustomResetPassword
            && $job->channels === ['mail']
            && $job->notifiables->contains(fn ($notifiable) => $notifiable->id === $user->id)
            && Password::broker()->tokenExists($user, $job->notification->token);
    });
    expect(DB::table('password_reset_tokens')->where('email', $user->email)->count())->toBe(1);
});

test('reset email link uses the configured frontend path and encodes email safely', function (string $frontend) {
    config(['app.url' => 'https://internpulse.example', 'app.frontend_url' => $frontend]);
    Notification::fake();
    $user = User::factory()->create(['email' => 'mika+intern@example.org']);
    $this->postJson('/api/v1/auth/forgot-password', ['email' => $user->email])->assertOk();
    $notification = Notification::sent($user, CustomResetPassword::class)->sole();
    $url = $notification->toMail($user)->actionUrl;
    parse_str(parse_url($url, PHP_URL_QUERY), $query);
    expect(parse_url($url, PHP_URL_SCHEME))->toBe('https');
    expect(parse_url($url, PHP_URL_HOST))->toBe('internpulse.example');
    expect(parse_url($url, PHP_URL_PATH))->toBe('/InternPulse/reset-password');
    expect($query)->toBe(['token' => $notification->token, 'email' => 'mika+intern@example.org']);
})->with(['https://internpulse.example/InternPulse/', '/InternPulse/']);

test('emailed reset token updates password removes lockout and allows sign-in', function () {
    Notification::fake();
    Event::fake([PasswordReset::class]);
    $user = User::factory()->create([
        'must_change_password' => true, 'password_changed_at' => now()->subDays(30),
        'login_failed_attempts' => 2, 'login_locked_until' => now()->addMinutes(30),
        'remember_token' => 'original-remember-token',
    ]);
    $this->postJson('/api/v1/auth/forgot-password', ['email' => $user->email])->assertOk();
    $token = Notification::sent($user, CustomResetPassword::class)->sole()->token;
    $storedToken = DB::table('password_reset_tokens')->where('email', $user->email)->value('token');
    expect($storedToken)->not->toBe($token);
    expect(Hash::check($token, $storedToken))->toBeTrue();

    $this->postJson('/api/v1/auth/reset-password', passwordResetPayload($user, $token))->assertOk();
    $fresh = $user->fresh();
    expect(Hash::check('ChangedPassword123!', $fresh->password))->toBeTrue();
    expect(Hash::check('password', $fresh->password))->toBeFalse();
    expect($fresh->password_changed_at->diffInSeconds(now(), true))->toBeLessThan(5);
    expect($fresh->login_failed_attempts)->toBe(0);
    expect($fresh->login_locked_until)->toBeNull();
    expect($fresh->must_change_password)->toBeFalse();
    expect($fresh->remember_token)->not->toBe('original-remember-token');
    $this->assertDatabaseMissing('password_reset_tokens', ['email' => $user->email]);
    Event::assertDispatched(PasswordReset::class, fn ($event) => $event->user->id === $user->id);
    expect(AccountNotification::where('user_id', $user->id)->where('title', 'Password reset')->count())->toBe(1);
    $this->postJson('/api/v1/auth/login', ['email' => $user->email, 'password' => 'ChangedPassword123!'])->assertOk();
    $this->postJson('/api/v1/auth/login', ['email' => $user->email, 'password' => 'password'])->assertUnauthorized();
});

test('reset rejects passwords missing a strength requirement without consuming the token', function (string $password) {
    $user = User::factory()->create();
    $token = Password::broker()->createToken($user);
    $original = $user->password;
    $this->postJson('/api/v1/auth/reset-password', passwordResetPayload($user, $token, $password))
        ->assertUnprocessable()->assertJsonPath('errors.0.source', 'password');
    expect($user->fresh()->password)->toBe($original);
    expect(Password::broker()->tokenExists($user, $token))->toBeTrue();
    expect(AccountNotification::count())->toBe(0);
})->with([
    'too short' => ['Aa1!x'],
    'no uppercase' => ['lowercase123!'],
    'no lowercase' => ['UPPERCASE123!'],
    'no number' => ['MixedCaseOnly!'],
    'no symbol' => ['MixedCase123'],
]);

test('reset rejects invalid expired or mismatched tokens without changing the password', function (string $case) {
    $user = User::factory()->create();
    $token = Password::broker()->createToken($user);
    $payload = passwordResetPayload($user, $token);
    if ($case === 'invalid token') $payload['token'] = 'not-the-issued-token';
    if ($case === 'wrong email') $payload['email'] = User::factory()->create()->email;
    if ($case === 'expired token') {
        $minutes = config('auth.passwords.'.config('auth.defaults.passwords').'.expire', 60);
        DB::table('password_reset_tokens')->where('email', $user->email)->update(['created_at' => now()->subMinutes($minutes + 1)]);
    }
    $original = $user->password;
    $this->postJson('/api/v1/auth/reset-password', $payload)->assertUnprocessable();
    expect($user->fresh()->password)->toBe($original);
    expect(AccountNotification::count())->toBe(0);
})->with(['invalid token', 'wrong email', 'expired token']);

test('reset requires matching password confirmation', function () {
    $user = User::factory()->create();
    $token = Password::broker()->createToken($user);
    $payload = passwordResetPayload($user, $token);
    $payload['password_confirmation'] = 'DifferentPassword123!';
    $this->postJson('/api/v1/auth/reset-password', $payload)->assertUnprocessable()->assertJsonPath('errors.0.source', 'password');
    expect(Hash::check('password', $user->fresh()->password))->toBeTrue();
    expect(Password::broker()->tokenExists($user, $token))->toBeTrue();
});

test('a consumed reset token cannot change the password again', function () {
    $user = User::factory()->create();
    $token = Password::broker()->createToken($user);
    $this->postJson('/api/v1/auth/reset-password', passwordResetPayload($user, $token))->assertOk();
    $this->postJson('/api/v1/auth/reset-password', passwordResetPayload($user, $token, 'AnotherPassword123!'))->assertUnprocessable();
    expect(Hash::check('ChangedPassword123!', $user->fresh()->password))->toBeTrue();
    expect(AccountNotification::where('title', 'Password reset')->count())->toBe(1);
});

test('unknown email cannot receive a reset notification', function () {
    Notification::fake();
    $this->postJson('/api/v1/auth/forgot-password', ['email' => 'missing@example.org'])->assertUnprocessable();
    Notification::assertNothingSent();
    expect(DB::table('password_reset_tokens')->count())->toBe(0);
});

test('repeat reset request is throttled without replacing the delivered token', function () {
    Notification::fake();
    $user = User::factory()->create();
    $this->postJson('/api/v1/auth/forgot-password', ['email' => $user->email])->assertOk();
    $token = Notification::sent($user, CustomResetPassword::class)->sole()->token;
    $this->postJson('/api/v1/auth/forgot-password', ['email' => $user->email])->assertUnprocessable();
    Notification::assertSentToTimes($user, CustomResetPassword::class, 1);
    expect(Password::broker()->tokenExists($user, $token))->toBeTrue();
});
