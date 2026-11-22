<?php

use App\Models\JwtToken;
use App\Models\Skill;
use App\Models\StudentProfile;
use App\Models\User;
use App\Permissions\V1\Abilities;
use App\Services\JwtTokenService;
use Carbon\Carbon;
use Firebase\JWT\JWT;

function skillsAuthToken(User $user): string
{
    return app(JwtTokenService::class)->issue($user, Abilities::getAbilities($user));
}

beforeEach(function () {
    Carbon::setTestNow('2026-11-23 10:00:00');
    JWT::$timestamp = now()->timestamp;
});
afterEach(function () {
    Carbon::setTestNow();
    JWT::$timestamp = null;
});

test('authenticated student can load program skill recommendations', function () {
    $student = StudentProfile::factory()->create(['program' => 'BSIT', 'course' => 'BSIT']);
    $skill = Skill::factory()->create(['name' => 'PHP Development', 'category' => 'BSIT']);
    $this->withToken(skillsAuthToken($student->user))->getJson('/api/v1/student/skill-recommendations')
        ->assertOk()->assertJsonPath('data.program', 'BSIT')
        ->assertJsonPath('data.profile_incomplete', false)->assertJsonPath('data.suggested_skills.data.0.id', $skill->id);
});

test('expired student access can refresh and load Skills without relogin', function () {
    $student = StudentProfile::factory()->create(['program' => 'BSIT', 'course' => 'BSIT']);
    $token = skillsAuthToken($student->user);
    Carbon::setTestNow('2026-11-23 11:01:00');
    JWT::$timestamp = now()->timestamp;
    $this->withToken($token)->getJson('/api/v1/student/skill-recommendations')->assertUnauthorized();
    $newToken = $this->postJson('/api/v1/auth/refresh')->assertOk()->json('data.token');
    expect($newToken)->not->toBe($token);
    $this->withToken($newToken)->getJson('/api/v1/student/skill-recommendations')->assertOk();
    expect(JwtToken::whereNotNull('revoked_at')->count())->toBe(1);
});

test('Skills requires an authenticated student account', function () {
    $this->getJson('/api/v1/student/skill-recommendations')->assertUnauthorized();
    $this->withToken(skillsAuthToken(User::factory()->company()->create()))
        ->getJson('/api/v1/student/skill-recommendations')->assertForbidden();
});

test('revoked student token cannot access Skills or refresh', function () {
    $student = StudentProfile::factory()->create();
    $token = skillsAuthToken($student->user);
    JwtToken::query()->update(['revoked_at' => now()]);
    $this->withToken($token)->getJson('/api/v1/student/skill-recommendations')->assertUnauthorized();
    $this->postJson('/api/v1/auth/refresh')->assertUnauthorized();
});

test('Skills search retains authenticated program-specific recommendations', function () {
    $student = StudentProfile::factory()->create(['program' => 'BSIT', 'course' => 'BSIT']);
    $matching = Skill::factory()->create(['name' => 'Network Administration', 'category' => 'BSIT']);
    Skill::factory()->create(['name' => 'Network Engineering', 'category' => 'BSCPE']);
    Skill::factory()->create(['name' => 'PHP Development', 'category' => 'BSIT']);
    $this->withToken(skillsAuthToken($student->user))
        ->getJson('/api/v1/student/skill-recommendations?search=Network')->assertOk()
        ->assertJsonPath('data.suggested_skills.total', 1)->assertJsonPath('data.suggested_skills.data.0.id', $matching->id);
});
