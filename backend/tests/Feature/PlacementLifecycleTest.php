<?php

use App\Models\Application;
use App\Models\AttendanceLog;
use App\Models\AuditLog;
use App\Models\CompanyProfile;
use App\Models\CoordinatorProfile;
use App\Models\InternshipPlacement;
use App\Models\InternshipPosting;
use App\Models\JournalEntry;
use App\Models\Notification;
use App\Models\StudentProfile;
use App\Models\User;
use App\Permissions\V1\Abilities;
use App\Services\JwtTokenService;
use Carbon\Carbon;

function deploymentToken(User $user): string
{
    return app(JwtTokenService::class)->issue($user, Abilities::getAbilities($user));
}

function deploymentFixture(): array
{
    $student = StudentProfile::factory()->create(['program' => 'BSIT', 'course' => 'BSIT', 'required_hours' => 480]);
    $coordinator = User::factory()->coordinator()->create();
    CoordinatorProfile::factory()->create(['user_id' => $coordinator->id, 'program' => 'BSIT']);
    $oldCompany = CompanyProfile::factory()->create(['program' => 'BSIT']);
    $newCompany = CompanyProfile::factory()->create(['program' => null]);
    $attributes = ['status' => 'approved', 'required_course' => 'BSIT', 'slots' => 3,
        'internship_start' => null, 'internship_end' => null, 'application_deadline' => null];
    $oldPosting = InternshipPosting::factory()->create($attributes + ['company_profile_id' => $oldCompany->id]);
    $newPosting = InternshipPosting::factory()->create($attributes + ['company_profile_id' => $newCompany->id]);
    $app = Application::create(['student_profile_id' => $student->id, 'internship_posting_id' => $oldPosting->id,
        'status' => 'accepted', 'applied_at' => now()]);
    $placement = InternshipPlacement::create(['student_profile_id' => $student->id,
        'internship_posting_id' => $oldPosting->id, 'application_id' => $app->id,
        'start_date' => '2026-11-01', 'end_date' => '2027-02-28', 'required_hours' => 480,
        'rendered_hours' => 200, 'status' => 'active']);
    $payload = ['source_placement_id' => $placement->id, 'new_company_id' => $newCompany->id,
        'new_posting_id' => $newPosting->id, 'reason' => 'Emergency relocation',
        'last_working_date' => '2026-11-23', 'start_date' => '2026-11-24',
        'end_date' => '2027-02-28', 'acceptance_confirmed' => true];

    return compact('student', 'coordinator', 'oldCompany', 'newCompany', 'oldPosting', 'newPosting', 'app', 'placement', 'payload');
}

function deploymentLog(array $f, array $overrides = []): AttendanceLog
{
    return AttendanceLog::create($overrides + [
        'internship_placement_id' => $f['placement']->id, 'student_profile_id' => $f['student']->id,
        'date' => '2026-11-22', 'time_in' => '08:00', 'time_out' => '15:30',
        'hours_rendered' => 7.5, 'status' => 'present',
    ]);
}

beforeEach(function () {
    Carbon::setTestNow('2026-11-23 10:00:00');
    \Firebase\JWT\JWT::$timestamp = now()->timestamp;
});
afterEach(function () {
    Carbon::setTestNow();
    \Firebase\JWT\JWT::$timestamp = null;
});

test('pull-out needs no replacement and retains records credits and notifications', function () {
    $f = deploymentFixture();
    $log = deploymentLog($f);
    $journal = JournalEntry::create(['internship_placement_id' => $f['placement']->id,
        'student_profile_id' => $f['student']->id, 'entry_date' => '2026-11-22', 'title' => 'Work', 'content' => 'Original journal']);
    $this->withToken(deploymentToken($f['coordinator']));
    $this->postJson('/api/v1/coordinator/students/'.$f['student']->id.'/pull-out', [
        'source_placement_id' => $f['placement']->id, 'reason' => 'Emergency', 'last_working_date' => '2026-11-23',
    ])->assertOk()->assertJsonPath('data.old_placement.status', 'pulled_out')
        ->assertJsonPath('data.new_placement', null)->assertJsonPath('data.progress.rendered_hours', 200)
        ->assertJsonPath('data.progress.remaining_hours', 280)->assertJsonPath('data.progress.awaiting_deployment', true);
    expect($f['app']->fresh()->status)->toBe('withdrawn');
    expect(InternshipPlacement::count())->toBe(1);
    expect($log->fresh()->internship_placement_id)->toBe($f['placement']->id);
    expect($journal->fresh()->content)->toBe('Original journal');
    expect(Notification::count())->toBe(2);
    expect(AuditLog::where('action', 'placement.pulled_out')->exists())->toBeTrue();
    $this->withToken(deploymentToken($f['student']->user))->getJson('/api/v1/student/overview')
        ->assertOk()->assertJsonPath('data.placement', null)->assertJsonPath('data.stats.required_hours', 480)
        ->assertJsonPath('data.stats.rendered_hours', 200);
});

test('direct transfer preserves original target and does not copy logs', function () {
    $f = deploymentFixture();
    deploymentLog($f);
    $this->withToken(deploymentToken($f['coordinator']));
    $result = $this->postJson('/api/v1/coordinator/students/'.$f['student']->id.'/transfer', $f['payload'])
        ->assertOk()->assertJsonPath('data.old_placement.status', 'transferred')
        ->assertJsonPath('data.new_placement.required_hours', 280)->assertJsonPath('data.new_placement.rendered_hours', 0)
        ->assertJsonPath('data.progress.required_hours', 480)->assertJsonPath('data.progress.rendered_hours', 200);
    $new = InternshipPlacement::findOrFail($result->json('data.new_placement.id'));
    expect($new->previous_placement_id)->toBe($f['placement']->id);
    expect($new->attendanceLogs()->count())->toBe(0);
    expect($new->application->status)->toBe('accepted');
    expect(Notification::count())->toBe(3);
    $this->postJson('/api/v1/coordinator/students/'.$f['student']->id.'/transfer', $f['payload'])->assertUnprocessable();
    expect(InternshipPlacement::count())->toBe(2);
});

test('pull-out can be redeployed later using a previously existing application', function () {
    $f = deploymentFixture();
    $existing = Application::create(['student_profile_id' => $f['student']->id,
        'internship_posting_id' => $f['newPosting']->id, 'status' => 'pending', 'applied_at' => now()]);
    $this->withToken(deploymentToken($f['coordinator']));
    $this->postJson('/api/v1/coordinator/students/'.$f['student']->id.'/pull-out', $f['payload'])->assertOk();
    $this->postJson('/api/v1/coordinator/students/'.$f['student']->id.'/transfer', $f['payload'])
        ->assertOk()->assertJsonPath('data.new_placement.application_id', $existing->id);
    expect(Application::count())->toBe(2);
    expect($existing->fresh()->status)->toBe('accepted');
    expect(AuditLog::where('action', 'placement.redeployed')->exists())->toBeTrue();
});

test('placement transfer endpoint uses the same safe transition', function () {
    $f = deploymentFixture();
    $payload = $f['payload'];
    unset($payload['source_placement_id'], $payload['new_posting_id'], $payload['reason']);
    $payload['new_internship_posting_id'] = $f['newPosting']->id;
    $payload['transfer_reason'] = 'Emergency';
    $this->withToken(deploymentToken($f['coordinator']))->postJson('/api/v1/coordinator/placements/'.$f['placement']->id.'/transfer', $payload)
        ->assertOk()->assertJsonPath('data.progress.required_hours', 480);
});

test('coordinator can finalize pending attendance after pull-out with fractional hours', function () {
    $f = deploymentFixture();
    $log = deploymentLog($f, ['time_out' => null, 'hours_rendered' => null]);
    $this->withToken(deploymentToken($f['coordinator']));
    $this->postJson('/api/v1/coordinator/students/'.$f['student']->id.'/pull-out', $f['payload'])->assertOk();
    $this->patchJson('/api/v1/coordinator/attendance/'.$log->id.'/review', [
        'decision' => 'approved', 'reason' => 'Verified shift with supervisor', 'time_out' => '15:30',
    ])->assertOk()->assertJsonPath('data.review_decision', 'approved')->assertJsonPath('data.hours_rendered', '7.50');
    expect($f['placement']->fresh()->rendered_hours)->toBe(207.5);
    $this->patchJson('/api/v1/coordinator/attendance/'.$log->id.'/review', [
        'decision' => 'approved', 'reason' => 'Repeated',
    ])->assertUnprocessable();
    expect(AuditLog::where('action', 'attendance.coordinator_review')->count())->toBe(1);
});

test('late company approval changes remaining target without erasing previous credits', function () {
    $f = deploymentFixture();
    $log = deploymentLog($f);
    $this->withToken(deploymentToken($f['coordinator']));
    $newId = $this->postJson('/api/v1/coordinator/students/'.$f['student']->id.'/transfer', $f['payload'])->assertOk()->json('data.new_placement.id');
    $this->withToken(deploymentToken($f['oldCompany']->user));
    $this->patchJson('/api/v1/company/attendance/'.$log->id.'/approve-time-in')->assertOk();
    $this->patchJson('/api/v1/company/attendance/'.$log->id.'/approve-time-out')->assertOk();
    expect($f['placement']->fresh()->rendered_hours)->toBe(207.5);
    expect(InternshipPlacement::findOrFail($newId)->required_hours)->toBe(272.5);
    $this->withToken(deploymentToken($f['student']->user))->getJson('/api/v1/student/overview')
        ->assertOk()->assertJsonPath('data.stats.rendered_hours', 207.5)->assertJsonPath('data.stats.required_hours', 480);
});

test('coordinator rejection cannot be overridden by company approval', function () {
    $f = deploymentFixture();
    $log = deploymentLog($f);
    $this->withToken(deploymentToken($f['coordinator']));
    $this->postJson('/api/v1/coordinator/students/'.$f['student']->id.'/pull-out', $f['payload'])->assertOk();
    $this->patchJson('/api/v1/coordinator/attendance/'.$log->id.'/review', ['decision' => 'rejected', 'reason' => 'Unverified shift'])->assertOk();
    $this->withToken(deploymentToken($f['oldCompany']->user))
        ->patchJson('/api/v1/company/attendance/'.$log->id.'/approve-time-in')->assertUnprocessable();
    expect($f['placement']->fresh()->rendered_hours)->toBe(200.0);
});

test('old records remain accessible and read-only after redeployment', function () {
    $f = deploymentFixture();
    $log = deploymentLog($f, ['date' => '2026-11-23', 'time_out' => null, 'hours_rendered' => null]);
    $journal = JournalEntry::create(['internship_placement_id' => $f['placement']->id,
        'student_profile_id' => $f['student']->id, 'entry_date' => '2026-11-23', 'title' => 'Work', 'content' => 'Original']);
    $this->withToken(deploymentToken($f['coordinator']))->postJson('/api/v1/coordinator/students/'.$f['student']->id.'/transfer', $f['payload'])->assertOk();
    $this->withToken(deploymentToken($f['student']->user));
    $this->getJson('/api/v1/student/journals?placement_id='.$f['placement']->id)->assertOk()
        ->assertJsonPath('data.can_write', false)->assertJsonPath('data.entries.data.0.content', 'Original');
    $this->getJson('/api/v1/student/attendance?placement_id='.$f['placement']->id)->assertOk()->assertJsonPath('data.logs.data.0.id', $log->id);
    $this->patchJson('/api/v1/student/journals/'.$journal->id, ['title' => 'Changed', 'content' => 'Changed'])->assertForbidden();
    $this->patchJson('/api/v1/student/attendance/'.$log->id.'/timeout', ['time_out' => '17:00'])->assertForbidden();
    $this->postJson('/api/v1/student/attendance', ['time_in' => '08:00'])->assertUnprocessable(); // Future new start.
});

test('student history cannot read another student deployment', function () {
    $f = deploymentFixture();
    $other = StudentProfile::factory()->create();
    $this->withToken(deploymentToken($other->user))->getJson('/api/v1/student/attendance?placement_id='.$f['placement']->id)->assertNotFound();
    $this->getJson('/api/v1/student/journals?placement_id='.$f['placement']->id)->assertNotFound();
});

test('companies can see only their own deployment history and approvals', function () {
    $f = deploymentFixture();
    $log = deploymentLog($f);
    $this->withToken(deploymentToken($f['newCompany']->user))->getJson('/api/v1/company/interns/'.$f['placement']->id)->assertForbidden();
    $this->patchJson('/api/v1/company/attendance/'.$log->id.'/approve-time-in')->assertForbidden();
    $this->withToken(deploymentToken($f['coordinator']))->postJson('/api/v1/coordinator/students/'.$f['student']->id.'/pull-out', $f['payload'])->assertOk();
    $this->withToken(deploymentToken($f['oldCompany']->user))->getJson('/api/v1/company/interns/'.$f['placement']->id)
        ->assertOk()->assertJsonPath('data.attendance_logs.0.id', $log->id);
});

test('coordinator program restrictions apply to transfer details and attendance reviews', function () {
    $f = deploymentFixture();
    $log = deploymentLog($f);
    $f['coordinator']->coordinatorProfile->update(['program' => 'BSCPE']);
    $this->withToken(deploymentToken($f['coordinator']));
    $this->postJson('/api/v1/coordinator/students/'.$f['student']->id.'/transfer', $f['payload'])->assertForbidden();
    $this->getJson('/api/v1/coordinator/students/'.$f['student']->id)->assertForbidden();
    $this->patchJson('/api/v1/coordinator/attendance/'.$log->id.'/review', ['decision' => 'rejected', 'reason' => 'No'])->assertForbidden();
});

test('invalid transfer input leaves original deployment application and notifications intact', function (string $case) {
    $f = deploymentFixture();
    $payload = $f['payload'];
    match ($case) {
        'mismatched company' => $payload['new_company_id'] = $f['oldCompany']->id,
        'same company' => $payload['new_posting_id'] = $f['oldPosting']->id,
        'no acceptance' => $payload['acceptance_confirmed'] = false,
        'overlap' => $payload['start_date'] = '2026-11-23',
        'future cutoff' => $payload['last_working_date'] = '2026-11-25',
        'before start' => $payload['last_working_date'] = '2026-10-31',
        'pending posting' => $f['newPosting']->update(['status' => 'pending']),
        'unverified partner' => $f['newCompany']->update(['verification_status' => 'pending']),
        'inactive partner' => $f['newCompany']->user->update(['is_active' => false]),
        'wrong program' => $f['newCompany']->update(['program' => 'BSCPE']),
        'wrong course' => $f['newPosting']->update(['required_course' => 'BSCPE']),
        'no slots' => $f['newPosting']->update(['slots' => 0]),
        'outside schedule' => $f['newPosting']->update(['internship_end' => '2026-12-01']),
    };
    $this->withToken(deploymentToken($f['coordinator']))->postJson('/api/v1/coordinator/students/'.$f['student']->id.'/transfer', $payload)->assertUnprocessable();
    expect($f['placement']->fresh()->status)->toBe('active');
    expect($f['app']->fresh()->status)->toBe('accepted');
    expect(InternshipPlacement::count())->toBe(1);
    expect(Notification::count())->toBe(0);
    expect(AuditLog::count())->toBe(0);
})->with(['mismatched company', 'same company', 'no acceptance', 'overlap', 'future cutoff', 'before start',
    'pending posting', 'unverified partner', 'inactive partner', 'wrong program', 'wrong course', 'no slots', 'outside schedule']);

test('cutoff cannot hide attendance or journals already recorded after it', function () {
    $f = deploymentFixture();
    deploymentLog($f, ['date' => '2026-11-23']);
    $this->withToken(deploymentToken($f['coordinator']))->postJson('/api/v1/coordinator/students/'.$f['student']->id.'/pull-out',
        ['source_placement_id' => $f['placement']->id, 'last_working_date' => '2026-11-22', 'reason' => 'Emergency'])->assertUnprocessable();
    expect($f['placement']->fresh()->status)->toBe('active');
});

test('transaction rolls back if notification storage fails', function () {
    $f = deploymentFixture();
    Notification::creating(function () { throw new RuntimeException('Simulated storage failure'); });
    try {
        $this->withToken(deploymentToken($f['coordinator']))->postJson('/api/v1/coordinator/students/'.$f['student']->id.'/transfer', $f['payload'])->assertStatus(500);
        expect($f['placement']->fresh()->status)->toBe('active');
        expect($f['app']->fresh()->status)->toBe('accepted');
        expect(InternshipPlacement::count())->toBe(1);
        expect(Application::count())->toBe(1);
        expect(AuditLog::count())->toBe(0);
    } finally {
        Notification::flushEventListeners();
    }
});

test('journal submissions cannot be dated in a previous deployment or future', function () {
    $f = deploymentFixture();
    $this->withToken(deploymentToken($f['student']->user));
    foreach (['2026-10-31', '2026-11-24'] as $date) {
        $this->postJson('/api/v1/student/journals', ['entry_date' => $date, 'title' => 'Work', 'content' => 'Tasks'])->assertUnprocessable();
    }
    expect(JournalEntry::count())->toBe(0);
});

test('migration preserves existing rows and separates pending hours from legacy credits', function () {
    $f = deploymentFixture();
    deploymentLog($f);
    $migration = require database_path('migrations/2026_11_23_000001_add_deployment_lifecycle_and_credits.php');
    $migration->backfillCredits();
    expect($f['placement']->fresh()->rendered_hours)->toBe(200.0);
    expect($f['placement']->fresh()->legacy_credited_hours)->toBe(192.5);
    expect($f['student']->fresh()->ojt_required_hours)->toBe(480.0);
    expect(InternshipPlacement::count())->toBe(1);
    expect(AttendanceLog::count())->toBe(1);
});


test('awaiting redeployment filter includes pulled-out students and removes them after transfer', function () {
    $f = deploymentFixture();
    $this->withToken(deploymentToken($f['coordinator']));
    $this->postJson('/api/v1/coordinator/students/'.$f['student']->id.'/pull-out', $f['payload'])->assertOk();
    $rows = $this->getJson('/api/v1/coordinator/students?placement_status=pulled_out')->assertOk()->json('data.data');
    expect(collect($rows)->pluck('id')->all())->toBe([$f['student']->id]);
    $this->getJson('/api/v1/coordinator/students/'.$f['student']->id.'/attendance?placement_id='.$f['placement']->id)->assertOk();
    $this->postJson('/api/v1/coordinator/students/'.$f['student']->id.'/transfer', $f['payload'])->assertOk();
    $rows = $this->getJson('/api/v1/coordinator/students?placement_status=pulled_out')->assertOk()->json('data.data');
    expect($rows)->toBe([]);
});

test('closed deployments cannot be marked complete and incomplete active deployments cannot finish', function () {
    $f = deploymentFixture();
    $this->withToken(deploymentToken($f['oldCompany']->user))
        ->patchJson('/api/v1/company/interns/'.$f['placement']->id.'/completion')->assertUnprocessable();
    $this->withToken(deploymentToken($f['coordinator']))
        ->postJson('/api/v1/coordinator/students/'.$f['student']->id.'/pull-out', $f['payload'])->assertOk();
    $this->withToken(deploymentToken($f['oldCompany']->user))
        ->patchJson('/api/v1/company/interns/'.$f['placement']->id.'/completion')->assertUnprocessable();
    expect($f['placement']->fresh()->status)->toBe('pulled_out');
});

test('completion uses the original requirement across deployments with fractional credits', function () {
    $f = deploymentFixture();
    $this->withToken(deploymentToken($f['coordinator']));
    $newId = $this->postJson('/api/v1/coordinator/students/'.$f['student']->id.'/transfer', $f['payload'])->assertOk()->json('data.new_placement.id');
    $new = InternshipPlacement::findOrFail($newId);
    $new->update(['rendered_hours' => 272.5, 'legacy_credited_hours' => 272.5]);
    $log = AttendanceLog::create(['internship_placement_id' => $newId, 'student_profile_id' => $f['student']->id,
        'date' => '2026-11-24', 'time_in' => '08:00', 'time_out' => '15:30', 'hours_rendered' => 7.5,
        'status' => 'present', 'time_in_approved_at' => now(), 'time_out_approved_at' => now()]);
    $this->withToken(deploymentToken($f['newCompany']->user))
        ->patchJson('/api/v1/company/interns/'.$newId.'/completion')->assertOk()->assertJsonPath('data.status', 'completed');
    expect($new->fresh()->rendered_hours)->toBe(280.0);
    $this->withToken(deploymentToken($f['student']->user))->getJson('/api/v1/student/overview')
        ->assertOk()->assertJsonPath('data.stats.rendered_hours', 480)->assertJsonPath('data.stats.required_hours', 480);
});

test('stale submission cannot attach old company records to a new active deployment', function () {
    $f = deploymentFixture();
    $payload = array_replace($f['payload'], ['last_working_date' => '2026-11-22', 'start_date' => '2026-11-23']);
    $this->withToken(deploymentToken($f['coordinator']));
    $newId = $this->postJson('/api/v1/coordinator/students/'.$f['student']->id.'/transfer', $payload)->assertOk()->json('data.new_placement.id');
    $this->withToken(deploymentToken($f['student']->user));
    $this->postJson('/api/v1/student/attendance', ['placement_id' => $f['placement']->id, 'time_in' => '08:00'])->assertUnprocessable();
    $this->postJson('/api/v1/student/journals', ['placement_id' => $f['placement']->id, 'entry_date' => '2026-11-23',
        'title' => 'Stale form', 'content' => 'Old company'])->assertUnprocessable();
    expect(AttendanceLog::count())->toBe(0);
    expect(JournalEntry::count())->toBe(0);
    $this->postJson('/api/v1/student/attendance', ['placement_id' => $newId, 'time_in' => '08:00', 'time_out' => '15:30'])
        ->assertOk()->assertJsonPath('data.hours_rendered', '7.50');
});

test('invalid source IDs cannot bypass transition replay checks', function () {
    $f = deploymentFixture();
    $this->withToken(deploymentToken($f['coordinator']))->postJson('/api/v1/coordinator/students/'.$f['student']->id.'/pull-out',
        ['source_placement_id' => 0, 'last_working_date' => '2026-11-23', 'reason' => 'Emergency'])->assertUnprocessable();
    expect($f['placement']->fresh()->status)->toBe('active');
});

test('time-out preserves exact fractional shift hours', function () {
    $f = deploymentFixture();
    $log = deploymentLog($f, ['date' => '2026-11-23', 'time_out' => null, 'hours_rendered' => null]);
    Carbon::setTestNow('2026-11-23 10:00:45');
    \Firebase\JWT\JWT::$timestamp = now()->timestamp;
    $this->withToken(deploymentToken($f['student']->user))->patchJson('/api/v1/student/attendance/'.$log->id.'/timeout',
        ['time_out' => '15:30'])->assertOk()->assertJsonPath('data.hours_rendered', '7.50');
});


test('transfer date errors identify the invalid field and display the full posting schedule', function (string $field, string $start, string $end, string $message) {
    $f = deploymentFixture();
    $f['newPosting']->update(['internship_start' => '2027-02-02', 'internship_end' => '2027-06-02']);
    $payload = array_replace($f['payload'], ['start_date' => $start, 'end_date' => $end]);
    $response = $this->withToken(deploymentToken($f['coordinator']))
        ->postJson('/api/v1/coordinator/students/'.$f['student']->id.'/transfer', $payload)
        ->assertUnprocessable()->assertJsonPath('errors.0.source', $field);
    expect($response->json('errors.0.message'))->toBe($message);
    expect($f['placement']->fresh()->status)->toBe('active');
    expect(InternshipPlacement::count())->toBe(1);
})->with([
    ['start_date', '2026-11-25', '2027-01-20', 'Posting schedule: Feb 2, 2027 to Jun 2, 2027. New start date must be on or after Feb 2, 2027.'],
    ['end_date', '2027-02-02', '2027-06-03', 'Posting schedule: Feb 2, 2027 to Jun 2, 2027. New target end date must be on or before Jun 2, 2027.'],
]);

test('overlap errors explain the inclusive last working day', function () {
    $f = deploymentFixture();
    $payload = array_replace($f['payload'], ['start_date' => '2026-11-23']);
    $response = $this->withToken(deploymentToken($f['coordinator']))
        ->postJson('/api/v1/coordinator/students/'.$f['student']->id.'/transfer', $payload)
        ->assertUnprocessable()->assertJsonPath('errors.0.source', 'start_date');
    expect($response->json('errors.0.message'))->toBe('New start date must be after Nov 23, 2026, the last working day at the previous company.');
});

test('transfer accepts dates at the inclusive posting schedule boundaries', function () {
    $f = deploymentFixture();
    $f['newPosting']->update(['internship_start' => '2027-02-02', 'internship_end' => '2027-06-02']);
    $payload = array_replace($f['payload'], ['start_date' => '2027-02-02', 'end_date' => '2027-06-02']);
    $response = $this->withToken(deploymentToken($f['coordinator']))
        ->postJson('/api/v1/coordinator/students/'.$f['student']->id.'/transfer', $payload)->assertOk();
    expect(substr($response->json('data.new_placement.start_date'), 0, 10))->toBe('2027-02-02');
    expect(substr($response->json('data.new_placement.end_date'), 0, 10))->toBe('2027-06-02');
});
