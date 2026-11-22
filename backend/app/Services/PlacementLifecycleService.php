<?php

namespace App\Services;

use App\Models\Application;
use App\Models\AttendanceLog;
use App\Models\AuditLog;
use App\Models\InternshipPlacement;
use App\Models\InternshipPosting;
use App\Models\Notification;
use App\Models\StudentProfile;
use App\Models\User;
use App\Support\AcademicPrograms;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PlacementLifecycleService
{
    public function authorize(User $actor, StudentProfile $student): void
    {
        abort_unless(in_array($actor->role, ['admin', 'coordinator'], true), 403);
        abort_unless($student->user, 404, 'Student account not found.');
        $program = $actor->coordinatorProfile?->program;
        if ($actor->role === 'coordinator' && trim((string) $program) !== '') {
            abort_unless(AcademicPrograms::code($program) !== null
                && AcademicPrograms::code($program) === AcademicPrograms::code($student->program ?: $student->course), 403);
        }
    }

    private function fail(string $field, string $message): never
    {
        throw ValidationException::withMessages([$field => $message]);
    }

    public function transition(User $actor, StudentProfile $student, array $input, bool $pullOut = false, ?int $sourceId = null): array
    {
        $this->authorize($actor, $student);

        return DB::transaction(function () use ($actor, $student, $input, $pullOut, $sourceId) {
            $student = StudentProfile::lockForUpdate()->findOrFail($student->id);
            $this->authorize($actor, $student);
            $latest = $student->placements()->orderByDesc('id')->lockForUpdate()->first();
            $active = $student->placements()->where('status', 'active')->lockForUpdate()->first();
            $source = $active ?? $latest;
            if (! $source || ($sourceId !== null && $source->id !== $sourceId)
                || (! $active && ($pullOut || $source->status !== 'pulled_out'))) {
                $this->fail('placement', 'The deployment has already changed. Refresh the student record.');
            }
            if ($student->placements()->where('status', 'active')->count() > 1) {
                $this->fail('placement', 'Multiple active deployments require correction before a transition.');
            }
            $last = $active ? Carbon::parse($input['last_working_date'])->toDateString() : $source->last_working_date->toDateString();
            if ($active) {
                if ($last < $source->start_date->toDateString() || $last > Carbon::today('Asia/Manila')->toDateString()) {
                    $this->fail('last_working_date', 'Last working day must fall between deployment start and today.');
                }
                if ($source->attendanceLogs()->whereDate('date', '>', $last)->exists()
                    || $source->journalEntries()->whereDate('entry_date', '>', $last)->exists()
                    || $source->weeklyLogs()->whereDate('week_end', '>', $last)->exists()) {
                    $this->fail('last_working_date', 'Records exist after this cutoff. Choose a last working day that preserves those records.');
                }
            }

            $hours = app(PlacementHoursService::class);
            $progress = $hours->synchronize($student);
            $target = null;
            $application = null;
            if (! $pullOut) {
                if (! in_array($input['acceptance_confirmed'] ?? null, [true, 1, '1', 'yes', 'on', 'true'], true)) {
                    $this->fail('acceptance_confirmed', 'Confirm the new company has accepted this transfer.');
                }
                $target = InternshipPosting::with('companyProfile.user')->lockForUpdate()->find($input['new_posting_id']);
                $company = $target?->companyProfile;
                if (! $target || ! $company?->user || ! $company->user->hasActiveAccess()
                    || ! $company->isVerified() || $target->status !== 'approved') {
                    $this->fail('new_posting_id', 'Choose an approved posting from an active verified partner.');
                }
                if ($target->company_profile_id !== (int) $input['new_company_id']) {
                    $this->fail('new_posting_id', 'The posting does not belong to the selected company.');
                }
                if ($company->id === $source->internshipPosting->company_profile_id) {
                    $this->fail('new_company_id', 'Choose a different company for this transfer.');
                }
                $program = $student->program ?: $student->course;
                if (! $company->isVisibleToProgram($program)
                    || (trim((string) $target->required_course) !== ''
                        && (! AcademicPrograms::code($target->required_course)
                            || AcademicPrograms::code($target->required_course) !== AcademicPrograms::code($program)))) {
                    $this->fail('new_posting_id', 'This placement is not compatible with the student program.');
                }
                $start = Carbon::parse($input['start_date'])->toDateString();
                $end = Carbon::parse($input['end_date'])->toDateString();
                if ($start <= $last) {
                    $lastLabel = Carbon::parse($last)->format('M j, Y');
                    $this->fail('start_date', "New start date must be after {$lastLabel}, the last working day at the previous company.");
                }
                if ($end < $start) {
                    $this->fail('end_date', 'New target end date must be on or after the new start date.');
                }
                $scheduleStart = $target->internship_start?->format('M j, Y') ?? 'no earliest date set';
                $scheduleEnd = $target->internship_end?->format('M j, Y') ?? 'no latest date set';
                $schedule = "Posting schedule: {$scheduleStart} to {$scheduleEnd}.";
                if ($target->internship_start && $start < $target->internship_start->toDateString()) {
                    $this->fail('start_date', "{$schedule} New start date must be on or after {$scheduleStart}.");
                }
                if ($target->internship_end && $end > $target->internship_end->toDateString()) {
                    $this->fail('end_date', "{$schedule} New target end date must be on or before {$scheduleEnd}.");
                }
                if ($progress['remaining_hours'] <= 0) {
                    $this->fail('placement', 'The original OJT hour requirement is already fulfilled.');
                }
                $application = Application::where('student_profile_id', $student->id)
                    ->where('internship_posting_id', $target->id)->lockForUpdate()->first();
                if ((! $application || $application->status !== 'accepted') && $target->getRemainingSlots() < 1) {
                    $this->fail('new_posting_id', 'The selected posting has no available slots.');
                }
            }

            if ($active) {
                $source->update([
                    'status' => $pullOut ? 'pulled_out' : 'transferred',
                    'last_working_date' => $last, 'closure_reason' => $input['reason'],
                    'closed_at' => now(), 'closed_by' => $actor->id,
                    'transfer_reason' => $pullOut ? null : $input['reason'],
                    'transferred_at' => $pullOut ? null : now(),
                    'transferred_by' => $pullOut ? null : $actor->id,
                ]);
                $source->application()->update(['status' => 'withdrawn', 'reviewed_at' => now()]);
            }
            $new = null;
            if ($target) {
                $application ??= new Application([
                    'student_profile_id' => $student->id, 'internship_posting_id' => $target->id,
                    'applied_at' => now(),
                ]);
                $application->fill(['status' => 'accepted', 'reviewed_at' => now()])->save();
                $new = InternshipPlacement::create([
                    'student_profile_id' => $student->id, 'internship_posting_id' => $target->id,
                    'application_id' => $application->id, 'approved_by' => $actor->id, 'coordinator_id' => $actor->id,
                    'previous_placement_id' => $source->id,
                    'start_date' => $input['start_date'], 'end_date' => $input['end_date'],
                    'required_hours' => $progress['remaining_hours'], 'rendered_hours' => 0,
                    'legacy_credited_hours' => 0, 'status' => 'active', 'approved_at' => now(),
                ]);
            }
            $action = $pullOut ? 'placement.pulled_out' : ($active ? 'placement.transferred' : 'placement.redeployed');
            AuditLog::record($action, $source, [
                'previous_placement_id' => $source->id, 'new_placement_id' => $new?->id,
                'last_working_date' => $last, 'reason' => $input['reason'],
                'acceptance_confirmed' => ! $pullOut, 'credited_hours' => $progress['rendered_hours'],
                'required_hours' => $progress['required_hours'],
            ]);
            $message = $pullOut
                ? 'Your deployment has ended. Your credited hours and records are preserved while awaiting a new company.'
                : "Your new deployment is with {$target->companyProfile->company_name}. Previous credits are preserved.";
            Notification::send($student->user_id, $action, $pullOut ? 'Emergency pull-out' : 'Company transfer', $message, [
                'placement_id' => $new?->id ?? $source->id, 'last_working_date' => $last,
            ]);
            if ($active && $source->internshipPosting->companyProfile?->user) {
                Notification::send($source->internshipPosting->companyProfile->user_id, $action,
                    'Intern deployment closed', "{$student->full_name}'s last working day was {$last}. Contact the coordinator for deployment concerns.",
                    ['placement_id' => $source->id]);
            }
            if ($new) {
                Notification::send($target->companyProfile->user_id, $action, 'Intern assigned',
                    "{$student->full_name} is assigned to {$target->title} starting {$input['start_date']}.",
                    ['placement_id' => $new->id]);
            }

            return ['old_placement' => $source->fresh(), 'new_placement' => $new?->load('internshipPosting.companyProfile'),
                'progress' => $hours->summary($student)];
        }, 3);
    }

    public function complete(User $actor, InternshipPlacement $placement, ?string $notes): InternshipPlacement
    {
        return DB::transaction(function () use ($actor, $placement, $notes) {
            $student = StudentProfile::lockForUpdate()->findOrFail($placement->student_profile_id);
            $placement = InternshipPlacement::lockForUpdate()->findOrFail($placement->id);
            abort_unless($actor->isCompany()
                && $placement->internshipPosting->companyProfile->user_id === $actor->id, 403);
            if ($placement->status !== 'active') {
                $this->fail('placement', 'Only an active deployment can be completed.');
            }
            $progress = app(PlacementHoursService::class)->synchronize($student);
            if ($progress['remaining_hours'] > 0) {
                $this->fail('rendered_hours', 'The student must fulfill the original OJT hour requirement before completion.');
            }
            $placement->refresh()->update([
                'status' => 'completed', 'completed_at' => now(), 'completion_approved_by' => $actor->id,
                'completion_notes' => $notes,
            ]);
            AuditLog::record('placement.completed', $placement, ['progress' => $progress]);
            Notification::send($student->user_id, 'placement_completed', 'Internship completed',
                'Your internship completion was approved by your company supervisor.', ['placement_id' => $placement->id]);
            return $placement->fresh();
        }, 3);
    }

    public function approveCompanyAttendance(User $actor, AttendanceLog $log, bool $timeOut): AttendanceLog
    {
        return DB::transaction(function () use ($actor, $log, $timeOut) {
            $student = StudentProfile::lockForUpdate()->findOrFail($log->student_profile_id);
            $log = AttendanceLog::lockForUpdate()->findOrFail($log->id);
            $placement = $log->internshipPlacement;
            abort_unless($actor->isCompany()
                && $placement->internshipPosting->companyProfile->user_id === $actor->id, 403);
            if ($log->review_decision !== null || ! $log->time_in
                || ($timeOut ? (! $log->time_out || ! $log->time_in_approved_at || $log->time_out_approved_at) : $log->time_in_approved_at)) {
                $this->fail('attendance', 'This attendance record does not need company approval.');
            }
            if ($log->date->toDateString() < $placement->start_date->toDateString()
                || $log->date->toDateString() > ($placement->last_working_date ?? $placement->end_date)->toDateString()) {
                $this->fail('attendance', 'Attendance falls outside this deployment.');
            }
            $prefix = $timeOut ? 'time_out' : 'time_in';
            $log->fill([$prefix.'_approved_by' => $actor->id, $prefix.'_approved_at' => now()]);
            if ($timeOut) {
                if (Carbon::parse($log->time_out)->lte(Carbon::parse($log->time_in))) {
                    $this->fail('attendance', 'Time-out must be later than time-in.');
                }
                $log->hours_rendered = round(Carbon::parse($log->time_in)->floatDiffInHours(Carbon::parse($log->time_out)), 2);
            }
            $log->save();
            app(PlacementHoursService::class)->synchronize($student);
            return $log->fresh();
        }, 3);
    }

    public function reviewAttendance(User $actor, AttendanceLog $log, array $input): AttendanceLog
    {
        $this->authorize($actor, $log->studentProfile);

        return DB::transaction(function () use ($actor, $log, $input) {
            $student = StudentProfile::lockForUpdate()->findOrFail($log->student_profile_id);
            $log = AttendanceLog::lockForUpdate()->findOrFail($log->id);
            $placement = $log->internshipPlacement;
            if (! in_array($placement->status, ['pulled_out', 'transferred'], true)
                || $log->isFullyApproved() || $log->review_decision !== null) {
                $this->fail('attendance', 'Only unresolved attendance from a closed deployment can be reviewed.');
            }
            if ($input['decision'] === 'approved') {
                $timeout = $input['time_out'] ?? $log->time_out;
                if (! $log->time_in || ! $timeout || Carbon::parse($timeout)->lte(Carbon::parse($log->time_in))) {
                    $this->fail('time_out', 'Provide a verified time-out later than the time-in.');
                }
                $log->fill([
                    'time_out' => $timeout,
                    'hours_rendered' => round(Carbon::parse($log->time_in)->floatDiffInHours(Carbon::parse($timeout)), 2),
                    'time_in_approved_at' => now(), 'time_in_approved_by' => $actor->id,
                    'time_out_approved_at' => now(), 'time_out_approved_by' => $actor->id,
                ]);
            }
            $log->fill(['review_decision' => $input['decision'], 'review_reason' => $input['reason'],
                'reviewed_at' => now(), 'reviewed_by' => $actor->id])->save();
            $progress = app(PlacementHoursService::class)->synchronize($student);
            AuditLog::record('attendance.coordinator_review', $log, $input + ['progress' => $progress]);
            Notification::send($student->user_id, 'attendance.reviewed', 'Attendance reviewed',
                'Your previous deployment attendance was reviewed by the coordinator.', ['placement_id' => $placement->id]);

            return $log->fresh();
        }, 3);
    }
}
