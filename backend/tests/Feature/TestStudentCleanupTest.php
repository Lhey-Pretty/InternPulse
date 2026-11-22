<?php

use App\Models\Application;
use App\Models\CompanyProfile;
use App\Models\InternshipPlacement;
use App\Models\InternshipPosting;
use App\Models\StudentProfile;
use App\Models\User;
use App\Permissions\V1\Abilities;
use App\Services\JwtTokenService;
use App\Support\TestStudentAccounts;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

function cleanupStudentFixture(bool $testName = false): StudentProfile
{
    $user = User::factory()->student()->create([
        'name' => $testName ? 'Alex Test11' : 'Riley Santos',
        'email' => Str::uuid().'@example.org',
    ]);
    return StudentProfile::create([
        'user_id' => $user->id, 'first_name' => $testName ? 'Alex' : 'Riley',
        'last_name' => $testName ? 'Test11' : 'Santos',
        'course' => 'BSIT', 'program' => 'BSIT', 'student_id_number' => null,
    ]);
}

function cleanupRelatedFixture(StudentProfile $student, float $rating = 4): array
{
    $companyUser = User::factory()->company()->create();
    $company = CompanyProfile::create([
        'user_id' => $companyUser->id, 'company_name' => 'Partner Company',
        'address' => 'Bongabong', 'verification_status' => 'verified',
    ]);
    $posting = InternshipPosting::create([
        'company_profile_id' => $company->id, 'title' => 'Internship', 'position' => 'Intern',
        'description' => 'Internship activities', 'location' => 'Bongabong', 'status' => 'approved',
    ]);
    $application = Application::create([
        'student_profile_id' => $student->id, 'internship_posting_id' => $posting->id,
        'status' => 'pending', 'applied_at' => now(),
    ]);
    $placement = InternshipPlacement::create([
        'student_profile_id' => $student->id, 'internship_posting_id' => $posting->id,
        'application_id' => $application->id, 'start_date' => today(), 'end_date' => today()->addMonths(3),
    ]);
    DB::table('evaluations')->insert([
        'student_profile_id' => $student->id, 'internship_placement_id' => $placement->id,
        'evaluated_by' => $companyUser->id, 'overall_rating' => $rating, 'evaluation_period' => 'final',
    ]);
    return compact('application', 'placement');
}

test('cleanup matches Test in names and preserves sample email and student ID matches', function () {
    $named = cleanupStudentFixture(true)->user;
    $sample = User::factory()->student()->create(['name' => 'Adrian Santos', 'email' => 'student01@minsu.edu.ph']);
    $emailOnly = User::factory()->student()->create(['name' => 'Riley Santos', 'email' => 'test.account@internpulse.local']);
    $idOnly = cleanupStudentFixture();
    $idOnly->update(['student_id_number' => 'IP-TEST-0101']);
    $other = User::factory()->student()->create(['name' => 'Contest Santos']);
    $admin = User::factory()->admin()->create(['name' => 'Admin Test11']);

    expect(TestStudentAccounts::reason($named))->toBe('Test marker in student name');
    expect(TestStudentAccounts::reason($sample))->toBeNull();
    expect(TestStudentAccounts::reason($emailOnly))->toBeNull();
    expect(TestStudentAccounts::reason($idOnly->user))->toBeNull();
    expect(TestStudentAccounts::reason($other))->toBeNull();
    expect(TestStudentAccounts::reason($admin))->toBeNull();
});

test('cleanup checks profile name fields while preserving demo students without Test names', function () {
    $named = User::factory()->student()->create(['name' => 'Maria Baga']);
    StudentProfile::create([
        'user_id' => $named->id, 'first_name' => 'Maria', 'middle_name' => 'Test',
        'last_name' => 'Baga', 'course' => 'BSIT',
    ]);
    $demo = User::factory()->student()->create(['name' => 'Juan dela Cruz', 'email' => 'student@internpulse.com']);
    StudentProfile::create([
        'user_id' => $demo->id, 'first_name' => 'Juan', 'last_name' => 'dela Cruz',
        'course' => 'BSIT', 'student_id_number' => 'BSIT-2024-0001',
    ]);

    expect(TestStudentAccounts::reason($named))->toBe('Test marker in student name');
    expect(TestStudentAccounts::reason($demo))->toBeNull();
});

test('test student cleanup dry run leaves accounts and related data unchanged', function () {
    $sample = cleanupStudentFixture(true);
    $records = cleanupRelatedFixture($sample);
    $this->artisan('students:remove-test', ['--dry-run' => true])->assertExitCode(0);
    expect(User::findOrFail($sample->user_id)->trashed())->toBeFalse();
    $this->assertDatabaseHas('applications', ['id' => $records['application']->id]);
    $this->assertDatabaseHas('internship_placements', ['id' => $records['placement']->id]);
});

test('test student cleanup is scoped soft deletion and can be repeated safely', function () {
    $sample = cleanupStudentFixture(true);
    $real = cleanupStudentFixture();
    $records = cleanupRelatedFixture($sample);
    $this->artisan('students:remove-test')->assertExitCode(0);
    $this->assertSoftDeleted('users', ['id' => $sample->user_id]);
    expect(User::findOrFail($real->user_id)->trashed())->toBeFalse();
    $this->assertDatabaseHas('student_profiles', ['id' => $sample->id]);
    $this->assertDatabaseHas('applications', ['id' => $records['application']->id]);
    $this->assertDatabaseHas('internship_placements', ['id' => $records['placement']->id]);
    $this->artisan('students:remove-test')->assertExitCode(0);
    expect(User::onlyTrashed()->count())->toBe(1);
});

test('default database seeding preserves the existing sample student setup', function () {
    $this->artisan('db:seed', ['--class' => DatabaseSeeder::class])->assertExitCode(0);
    expect(User::where('role', 'student')->count())->toBe(10);
    expect(StudentProfile::count())->toBe(10);
    $this->artisan('students:remove-test')->assertExitCode(0);
    expect(User::where('role', 'student')->count())->toBe(10);
    expect(User::onlyTrashed()->count())->toBe(0);
});

test('admin totals and ML summaries exclude related records of removed test students', function () {
    $admin = User::factory()->admin()->create();
    $real = cleanupStudentFixture();
    $sample = cleanupStudentFixture(true);
    cleanupRelatedFixture($real, 4);
    cleanupRelatedFixture($sample, 1);
    $token = app(JwtTokenService::class)->issue($admin, Abilities::getAbilities($admin));

    $this->withToken($token)->getJson('/api/v1/admin/reports')
        ->assertOk()->assertJsonPath('data.users.students', 2)->assertJsonPath('data.placements.active', 2);
    $this->artisan('students:remove-test')->assertExitCode(0);

    $this->getJson('/api/v1/admin/reports')->assertOk()
        ->assertJsonPath('data.users.students', 1)
        ->assertJsonPath('data.students.total', 1)
        ->assertJsonPath('data.placements.active', 1)
        ->assertJsonPath('data.applications.total', 1)
        ->assertJsonPath('data.applications.pending', 1)
        ->assertJsonPath('data.evaluations.count', 1)
        ->assertJsonPath('data.average_evaluation', 4);
    $this->getJson('/api/v1/admin/students')->assertOk()->assertJsonPath('data.stats.total', 1);
    $this->getJson('/api/v1/admin/ml-dashboard')->assertOk()
        ->assertJsonPath('data.stats.total_placements', 1)
        ->assertJsonPath('data.stats.avg_system_rating', 4);
    expect(DB::table('applications')->count())->toBe(2);
    expect(DB::table('internship_placements')->count())->toBe(2);
    expect(DB::table('evaluations')->count())->toBe(2);
});

test('restoring a removed student includes their retained related records in admin totals again', function () {
    $admin = User::factory()->admin()->create();
    $sample = cleanupStudentFixture(true);
    cleanupRelatedFixture($sample);
    $this->artisan('students:remove-test')->assertExitCode(0);
    $token = app(JwtTokenService::class)->issue($admin, Abilities::getAbilities($admin));

    $this->withToken($token)->getJson('/api/v1/admin/reports')->assertOk()->assertJsonPath('data.placements.active', 0);
    $this->postJson("/api/v1/admin/users/{$sample->user_id}/restore")->assertOk();
    $this->getJson('/api/v1/admin/reports')->assertOk()
        ->assertJsonPath('data.users.students', 1)->assertJsonPath('data.placements.active', 1)
        ->assertJsonPath('data.applications.total', 1)->assertJsonPath('data.evaluations.count', 1);
});

test('cleanup leaves the non Test sample account and its edited profile untouched', function () {
    $user = User::factory()->student()->create(['name' => 'Adrian Santos', 'email' => 'student01@minsu.edu.ph']);
    $profile = StudentProfile::create([
        'user_id' => $user->id, 'first_name' => 'Adrian', 'last_name' => 'Santos',
        'course' => 'BSIT', 'student_id_number' => 'MBC-09876',
    ]);
    $named = cleanupStudentFixture(true);
    $this->artisan('students:remove-test')->assertExitCode(0);

    expect(User::findOrFail($user->id)->trashed())->toBeFalse();
    expect($profile->fresh()->student_id_number)->toBe('MBC-09876');
    $this->assertSoftDeleted('users', ['id' => $named->user_id]);
});

test('coordinator lists keep non Test students with test emails and missing student IDs', function () {
    $student = cleanupStudentFixture();
    $student->user->update(['email' => 'test.email@example.org']);
    $coordinator = User::factory()->coordinator()->create();
    $token = app(JwtTokenService::class)->issue($coordinator, Abilities::getAbilities($coordinator));

    $this->withToken($token)->getJson('/api/v1/coordinator/students')->assertOk();
    $response = $this->getJson('/api/v1/coordinator/students')->assertOk();
    expect($response->getContent())->toContain('Riley');
    $this->getJson('/api/v1/coordinator/overview')->assertOk()->assertJsonPath('data.stats.total_students', 1);
});
