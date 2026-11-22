<?php

use App\Models\Application;
use App\Models\AuditLog;
use App\Models\CompanyProfile;
use App\Models\InternshipPlacement;
use App\Models\InternshipPosting;
use App\Models\JwtToken;
use App\Models\StudentProfile;
use App\Models\User;
use App\Permissions\V1\Abilities;
use App\Services\JwtTokenService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

function softDeleteToken(User $user): string
{
    return app(JwtTokenService::class)->issue($user, Abilities::getAbilities($user));
}

function softDeleteCompany(): CompanyProfile
{
    $user = User::factory()->company()->create();

    return CompanyProfile::create([
        'user_id' => $user->id, 'company_name' => 'Partner Company',
        'address' => 'Bongabong', 'verification_status' => 'verified', 'program' => 'BSIT',
    ]);
}

function softDeletePosting(?CompanyProfile $company = null, string $status = 'approved'): InternshipPosting
{
    $company ??= softDeleteCompany();

    return InternshipPosting::create([
        'company_profile_id' => $company->id, 'title' => 'Software Internship',
        'position' => 'Intern', 'description' => 'Develop software.',
        'location' => 'Bongabong', 'status' => $status, 'slots' => 3,
        'required_course' => 'BSIT', 'required_skills' => ['PHP'],
    ]);
}

function softDeleteStudent(): StudentProfile
{
    $user = User::factory()->student()->create([
        'name' => 'Mika Rivera', 'email' => Str::uuid().'@example.org',
    ]);

    return StudentProfile::create([
        'user_id' => $user->id, 'first_name' => 'Mika', 'last_name' => 'Rivera',
        'student_id_number' => 'ST'.Str::upper(Str::random(12)), 'course' => 'BSIT', 'program' => 'BSIT',
    ]);
}

function softDeleteApplication(StudentProfile $student, InternshipPosting $posting): Application
{
    return Application::create([
        'student_profile_id' => $student->id, 'internship_posting_id' => $posting->id,
        'status' => 'pending', 'applied_at' => now(),
    ]);
}

test('admin user deletion retains the user profile applications and placements', function () {
    $admin = User::factory()->admin()->create();
    $student = softDeleteStudent();
    $posting = softDeletePosting();
    $application = softDeleteApplication($student, $posting);
    $placement = InternshipPlacement::create([
        'student_profile_id' => $student->id, 'internship_posting_id' => $posting->id,
        'application_id' => $application->id, 'start_date' => today(),
        'end_date' => today()->addMonths(3), 'required_hours' => 480,
    ]);
    $userId = $student->user_id;

    $this->withToken(softDeleteToken($admin))->deleteJson("/api/v1/admin/users/{$userId}")->assertOk();

    $this->assertSoftDeleted('users', ['id' => $userId]);
    $this->assertDatabaseHas('student_profiles', ['id' => $student->id]);
    $this->assertDatabaseHas('applications', ['id' => $application->id]);
    $this->assertDatabaseHas('internship_placements', ['id' => $placement->id]);
    expect(User::find($userId))->toBeNull();
    expect(User::onlyTrashed()->findOrFail($userId)->hasActiveAccess())->toBeFalse();
    expect(AuditLog::where('action', 'user.deleted')->where('subject_id', $userId)->exists())->toBeTrue();
});

test('deleted users are hidden from normal lists and available in admin Trash', function () {
    $admin = User::factory()->admin()->create();
    $deleted = User::factory()->create(['name' => 'Removed Account']);
    $active = User::factory()->create(['name' => 'Visible Account']);
    $deleted->delete();

    $this->withToken(softDeleteToken($admin));
    $normal = $this->getJson('/api/v1/admin/users')->assertOk()->json('data.data');
    expect(collect($normal)->pluck('id'))->not->toContain($deleted->id);
    expect(collect($normal)->pluck('id'))->toContain($active->id);
    $trash = $this->getJson('/api/v1/admin/users?trashed=1&search=Removed')->assertOk()->json('data.data');
    expect(collect($trash)->pluck('id')->all())->toBe([$deleted->id]);
    $this->getJson("/api/v1/users/{$deleted->id}")->assertNotFound();
    $this->patchJson("/api/v1/admin/users/{$deleted->id}", [])->assertNotFound();
});

test('admin can restore a user without losing their profile', function () {
    $admin = User::factory()->admin()->create();
    $student = softDeleteStudent();
    $user = $student->user;
    $user->delete();

    $this->withToken(softDeleteToken($admin))
        ->postJson("/api/v1/admin/users/{$user->id}/restore")->assertOk();

    expect(User::findOrFail($user->id)->trashed())->toBeFalse();
    expect($student->fresh()->user->id)->toBe($user->id);
    expect(AuditLog::where('action', 'user.restored')->where('subject_id', $user->id)->exists())->toBeTrue();
});

test('deleted account sessions remain revoked after restoration', function () {
    $admin = User::factory()->admin()->create();
    $user = User::factory()->create();
    $oldToken = softDeleteToken($user);
    $adminToken = softDeleteToken($admin);

    $this->withToken($adminToken)->deleteJson("/api/v1/admin/users/{$user->id}")->assertOk();
    expect(JwtToken::where('user_id', $user->id)->whereNull('revoked_at')->exists())->toBeFalse();
    $this->withToken($oldToken)->getJson('/api/v1/auth/me')->assertUnauthorized();
    $this->postJson('/api/v1/auth/login', ['email' => $user->email, 'password' => 'password'])->assertUnauthorized();
    $this->withToken($adminToken)->postJson("/api/v1/admin/users/{$user->id}/restore")->assertOk();
    $this->withToken($oldToken)->getJson('/api/v1/auth/me')->assertUnauthorized();
    $this->postJson('/api/v1/auth/login', ['email' => $user->email, 'password' => 'password'])->assertOk();
});

test('non admins cannot list Trash or restore users', function () {
    $user = User::factory()->create(['is_manager' => true]);
    $deleted = User::factory()->create();
    $deleted->delete();

    $this->withToken(softDeleteToken($user));
    $this->getJson('/api/v1/admin/users?trashed=1')->assertForbidden();
    $this->postJson("/api/v1/admin/users/{$deleted->id}/restore")->assertForbidden();
    expect(User::onlyTrashed()->whereKey($deleted->id)->exists())->toBeTrue();
});

test('user restore requires a deleted account and self deletion remains blocked', function () {
    $admin = User::factory()->admin()->create();
    $active = User::factory()->create();
    $this->withToken(softDeleteToken($admin));

    $this->postJson("/api/v1/admin/users/{$active->id}/restore")->assertUnprocessable();
    $this->postJson('/api/v1/admin/users/999999/restore')->assertNotFound();
    $this->deleteJson("/api/v1/admin/users/{$admin->id}")->assertUnprocessable();
    expect($admin->fresh()->trashed())->toBeFalse();
});

test('restoring an inactive user preserves their inactive status', function () {
    $admin = User::factory()->admin()->create();
    $inactive = User::factory()->inactive()->create();
    $inactive->delete();

    $this->withToken(softDeleteToken($admin))->postJson("/api/v1/admin/users/{$inactive->id}/restore")->assertOk();
    expect($inactive->fresh()->is_active)->toBeFalse();
    $this->postJson('/api/v1/auth/login', ['email' => $inactive->email, 'password' => 'password'])->assertForbidden();
});

test('deleted user email remains reserved for restoration', function () {
    $user = User::factory()->create();
    $user->delete();

    $this->postJson('/api/v1/auth/register', [
        'account_type' => 'student', 'name' => 'Another Student', 'email' => $user->email,
        'program' => 'BSIT', 'password' => 'StrongPass1!', 'password_confirmation' => 'StrongPass1!',
    ])->assertUnprocessable();
    expect(User::withTrashed()->where('email', $user->email)->count())->toBe(1);
});

test('deleted students are hidden from admin and coordinator directories', function () {
    $admin = User::factory()->admin()->create();
    $coordinator = User::factory()->coordinator()->create();
    $student = softDeleteStudent();
    $student->user->delete();

    $this->withToken(softDeleteToken($admin));
    $this->getJson('/api/v1/admin/students')->assertOk()->assertJsonPath('data.stats.total', 0);
    $this->getJson("/api/v1/admin/students/{$student->id}")->assertNotFound();
    $this->withToken(softDeleteToken($coordinator));
    $response = $this->getJson('/api/v1/coordinator/students')->assertOk();
    expect($response->getContent())->not->toContain('Mika');
    $this->patchJson("/api/v1/coordinator/students/{$student->id}/approve")->assertNotFound();
    $this->assertDatabaseHas('student_profiles', ['id' => $student->id]);
});

test('deleting a company account hides its directory entry and public postings', function () {
    $admin = User::factory()->admin()->create();
    $company = softDeleteCompany();
    $posting = softDeletePosting($company);
    $company->user->delete();

    $this->getJson("/api/v1/internships/{$posting->id}")->assertNotFound();
    $this->getJson('/api/v1/internships')->assertOk()->assertJsonPath('meta.total', 0);
    $this->withToken(softDeleteToken($admin));
    $this->getJson('/api/v1/admin/companies')->assertOk()->assertJsonPath('data.total', 0);
    $this->patchJson("/api/v1/admin/companies/{$company->id}/verification", ['status' => 'verified'])->assertNotFound();
    $this->assertDatabaseHas('company_profiles', ['id' => $company->id]);
    $this->assertDatabaseHas('internship_postings', ['id' => $posting->id, 'deleted_at' => null]);
});

test('company posting deletion is soft and public routes hide it', function () {
    $company = softDeleteCompany();
    $posting = softDeletePosting($company);

    $this->withToken(softDeleteToken($company->user))->deleteJson("/api/v1/company/postings/{$posting->id}")->assertOk();
    $this->assertSoftDeleted('internship_postings', ['id' => $posting->id]);
    expect($posting->fresh()->isOpen())->toBeFalse();
    $this->getJson("/api/v1/internships/{$posting->id}")->assertNotFound();
    $this->getJson('/api/v1/internships')->assertOk()->assertJsonPath('meta.total', 0);
    $this->getJson('/api/v1/company/postings')->assertOk()->assertJsonPath('data.total', 0);
    $this->getJson('/api/v1/company/postings?trashed=1')->assertOk()->assertJsonPath('data.data.0.id', $posting->id);
});

test('posting restoration recovers the same record and company visibility', function () {
    $company = softDeleteCompany();
    $posting = softDeletePosting($company);
    $posting->delete();

    $this->withToken(softDeleteToken($company->user))->postJson("/api/v1/company/postings/{$posting->id}/restore")->assertOk();
    expect($posting->fresh()->trashed())->toBeFalse();
    $this->getJson('/api/v1/company/postings')->assertOk()->assertJsonPath('data.data.0.id', $posting->id);
    $this->getJson("/api/v1/internships/{$posting->id}")->assertOk();
    expect(AuditLog::where('action', 'internship_posting.restored')->where('subject_id', $posting->id)->exists())->toBeTrue();
});

test('company Trash and restore do not allow access to another company posting', function () {
    $company = softDeleteCompany();
    $other = softDeleteCompany();
    $own = softDeletePosting($company);
    $foreign = softDeletePosting($other);
    $own->delete();
    $foreign->delete();

    $this->withToken(softDeleteToken($company->user));
    $trash = $this->getJson('/api/v1/company/postings?trashed=1')->assertOk()->json('data.data');
    expect(collect($trash)->pluck('id')->all())->toBe([$own->id]);
    $this->postJson("/api/v1/company/postings/{$foreign->id}/restore")->assertForbidden();
    expect($foreign->fresh()->trashed())->toBeTrue();
});

test('pending posting deletion preserves application and placement history', function () {
    $company = softDeleteCompany();
    $posting = softDeletePosting($company, 'pending');
    $student = softDeleteStudent();
    $application = softDeleteApplication($student, $posting);
    $placement = InternshipPlacement::create([
        'student_profile_id' => $student->id, 'internship_posting_id' => $posting->id,
        'application_id' => $application->id, 'start_date' => today(), 'end_date' => today()->addMonths(3),
    ]);

    $this->withToken(softDeleteToken($company->user))->deleteJson("/api/v1/company/postings/{$posting->id}")->assertOk();
    $this->assertDatabaseHas('applications', ['id' => $application->id]);
    $this->assertDatabaseHas('internship_placements', ['id' => $placement->id]);
    expect($application->fresh()->internshipPosting->trashed())->toBeTrue();
    expect($placement->fresh()->internshipPosting->trashed())->toBeTrue();
    $this->patchJson("/api/v1/company/postings/{$posting->id}", [])->assertNotFound();
    $this->patchJson("/api/v1/company/applicants/{$application->id}/status", ['status' => 'accepted'])->assertNotFound();
});

test('approved posting application protection remains enforced', function () {
    $company = softDeleteCompany();
    $posting = softDeletePosting($company);
    softDeleteApplication(softDeleteStudent(), $posting);

    $this->withToken(softDeleteToken($company->user))->deleteJson("/api/v1/company/postings/{$posting->id}")->assertUnprocessable();
    expect($posting->fresh()->trashed())->toBeFalse();
});

test('restore posting rejects active missing or unauthorized resources', function () {
    $company = softDeleteCompany();
    $active = softDeletePosting($company);
    $deleted = softDeletePosting($company);
    $deleted->delete();

    $this->withToken(softDeleteToken($company->user));
    $this->postJson("/api/v1/company/postings/{$active->id}/restore")->assertUnprocessable();
    $this->postJson('/api/v1/company/postings/999999/restore')->assertNotFound();
    $this->withToken(softDeleteToken(User::factory()->student()->create()));
    $this->postJson("/api/v1/company/postings/{$deleted->id}/restore")->assertForbidden();
});

test('historical audit identity remains available after user deletion', function () {
    $user = User::factory()->create();
    $audit = AuditLog::create(['user_id' => $user->id, 'action' => 'sample.action']);
    $user->delete();

    expect($audit->fresh()->user->id)->toBe($user->id);
    expect($audit->fresh()->user->trashed())->toBeTrue();
});

test('soft delete migration rollback preserves stored account and posting rows', function () {
    $user = User::factory()->create();
    $posting = softDeletePosting();
    $migration = require database_path('migrations/2026_11_22_000001_add_soft_deletes_to_users_and_internship_postings.php');

    $migration->down();
    expect(DB::table('users')->where('id', $user->id)->exists())->toBeTrue();
    expect(DB::table('internship_postings')->where('id', $posting->id)->exists())->toBeTrue();
    $migration->up();
    expect(User::findOrFail($user->id)->trashed())->toBeFalse();
    expect(InternshipPosting::findOrFail($posting->id)->trashed())->toBeFalse();
});

test('coordinator company search cannot reveal a deleted company account', function () {
    $coordinator = User::factory()->coordinator()->create();
    $company = softDeleteCompany();
    $company->update(['industry' => 'Computing']);
    $company->user->delete();

    $response = $this->withToken(softDeleteToken($coordinator))
        ->getJson('/api/v1/coordinator/companies?search=Computing')->assertOk();
    expect($response->json('data.total'))->toBe(0);
});
