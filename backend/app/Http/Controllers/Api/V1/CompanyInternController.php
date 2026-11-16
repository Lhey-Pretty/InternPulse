<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\Application;
use App\Models\AttendanceLog;
use App\Models\CompanyProfile;
use App\Models\Evaluation;
use App\Models\InternshipPlacement;
use App\Models\InternshipTask;
use App\Models\JournalEntry;
use App\Models\Notification;
use App\Models\SystemSetting;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CompanyInternController extends ApiController
{
    // ── Interns ─────────────────────────────────────────────────────────────

    public function interns(Request $request): JsonResponse
    {
        $company = $this->company($request);
        $postingIds = $company->internshipPostings()->pluck('id');

        $placements = InternshipPlacement::whereIn('internship_posting_id', $postingIds)
            ->with([
                'studentProfile:id,first_name,middle_name,last_name,student_id_number,course',
                'internshipPosting:id,title'
            ])
            ->when($request->input('status'), fn ($q, $status) => $q->where('status', $status))
            ->when($request->input('search'), fn ($q, $search) => $q->whereHas('studentProfile', fn ($s) => $s
                ->where('first_name', 'like', "%{$search}%")
                ->orWhere('last_name', 'like', "%{$search}%")
                ->orWhere('student_id_number', 'like', "%{$search}%")))
            ->select('id', 'student_profile_id', 'internship_posting_id', 'status', 'start_date', 'end_date', 'required_hours', 'rendered_hours', 'created_at')
            ->latest()
            ->paginate(10);

        return $this->ok('Interns retrieved.', $placements);
    }

    public function intern(Request $request, InternshipPlacement $placement): JsonResponse
    {
        $this->authorizePlacement($request, $placement);

        $placement->load([
            'studentProfile.skills',
            'internshipPosting.companyProfile',
            'tasks',
            'attendanceLogs' => fn ($q) => $q->orderByDesc('date')->limit(30),
            'evaluations',
            'weeklyLogs' => fn ($q) => $q->orderByDesc('week_number')->limit(10),
            'journalEntries' => fn ($q) => $q->orderByDesc('entry_date')->limit(15),
        ]);

        return $this->ok('Intern details retrieved.', $placement);
    }

    // ── Attendance approvals ────────────────────────────────────────────────

    public function attendanceApprovals(Request $request): JsonResponse
    {
        $company = $this->company($request);
        $postingIds = $company->internshipPostings()->pluck('id');

        $placements = InternshipPlacement::whereIn('internship_posting_id', $postingIds)
            ->with(['studentProfile', 'internshipPosting', 'attendanceLogs' => fn ($q) => $q->orderByDesc('date')])
            ->where('status', 'active')
            ->when($request->input('search'), function ($q, $search) {
                $q->whereHas('studentProfile', fn ($s) => $s
                    ->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('student_id_number', 'like', "%{$search}%"));
            })
            ->latest()
            ->paginate(10);

        return $this->ok('Attendance approvals retrieved.', $placements);
    }

    public function approveTimeIn(Request $request, AttendanceLog $attendanceLog): JsonResponse
    {
        $this->authorizeAttendance($request, $attendanceLog);

        if (! $attendanceLog->time_in || $attendanceLog->time_in_approved_at) {
            return $this->error('This time-in does not need approval.', 422);
        }

        $attendanceLog->update([
            'time_in_approved_by' => $request->user()->id,
            'time_in_approved_at' => now(),
        ]);

        $this->recalculateRenderedHours($attendanceLog->internshipPlacement);

        return $this->ok('Time-in approved.', $attendanceLog->fresh());
    }

    public function approveTimeOut(Request $request, AttendanceLog $attendanceLog): JsonResponse
    {
        $this->authorizeAttendance($request, $attendanceLog);

        if (! $attendanceLog->time_out || ! $attendanceLog->time_in_approved_at || $attendanceLog->time_out_approved_at) {
            return $this->error('This time-out does not need approval.', 422);
        }

        $attendanceLog->update([
            'time_out_approved_by' => $request->user()->id,
            'time_out_approved_at' => now(),
            'hours_rendered' => $this->calculateHours($attendanceLog),
        ]);

        $this->recalculateRenderedHours($attendanceLog->internshipPlacement);

        return $this->ok('Time-out approved.', $attendanceLog->fresh());
    }

    // ── Tasks ───────────────────────────────────────────────────────────────

    public function storeTask(Request $request, InternshipPlacement $placement): JsonResponse
    {
        $this->authorizePlacement($request, $placement);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:200'],
            'description' => ['nullable', 'string', 'max:2000'],
            'due_date' => ['nullable', 'date'],
        ]);

        $task = InternshipTask::create(array_merge($validated, [
            'internship_placement_id' => $placement->id,
            'status' => 'pending',
        ]));

        return $this->ok('Task assigned.', $task);
    }

    public function taskFeedback(Request $request, InternshipTask $task): JsonResponse
    {
        $this->authorizePlacement($request, $task->internshipPlacement);

        $validated = $request->validate([
            'supervisor_feedback' => ['required', 'string', 'max:2000'],
        ]);

        $task->update($validated);

        return $this->ok('Feedback saved.', $task->fresh());
    }

    // ── Journal review ──────────────────────────────────────────────────────

    public function journals(Request $request): JsonResponse
    {
        $company = $this->company($request);
        $postingIds = $company->internshipPostings()->pluck('id');

        $placements = InternshipPlacement::whereIn('internship_posting_id', $postingIds)
            ->with(['studentProfile', 'internshipPosting', 'journalEntries' => fn ($q) => $q->orderByDesc('entry_date')])
            ->whereIn('status', ['active', 'completed'])
            ->when($request->input('placement_id'), fn ($q, $id) => $q->where('id', $id))
            ->get();

        $entries = null;
        $selectedPlacement = $placements->firstWhere('id', (int) $request->input('placement_id'));

        if ($selectedPlacement) {
            $entries = $selectedPlacement->journalEntries()
                ->orderByDesc('entry_date')
                ->paginate(10);
        }

        return $this->ok('Journal review data retrieved.', [
            'placements' => $placements,
            'selected_placement' => $selectedPlacement,
            'entries' => $entries,
        ]);
    }

    public function reviewJournal(Request $request, JournalEntry $journalEntry): JsonResponse
    {
        $this->authorizeJournal($request, $journalEntry);

        $validated = $request->validate([
            'supervisor_remarks' => ['nullable', 'string', 'max:1000'],
        ]);

        $journalEntry->update(array_merge($validated, ['is_verified' => true]));

        if (! empty($validated['supervisor_remarks'])) {
            Notification::send(
                $journalEntry->studentProfile->user_id,
                'journal_reviewed',
                'Journal Reviewed',
                "Your journal entry \"{$journalEntry->title}\" received supervisor feedback."
            );
        }

        return $this->ok('Journal entry reviewed.', $journalEntry->fresh());
    }

    // ── Evaluations ─────────────────────────────────────────────────────────

    public function evaluations(Request $request): JsonResponse
    {
        $company = $this->company($request);
        $postingIds = $company->internshipPostings()->pluck('id');
        $search = $request->input('search', '');

        $evaluations = Evaluation::whereHas(
            'internshipPlacement',
            fn ($q) => $q->whereIn('internship_posting_id', $postingIds)
        )
            ->with([
                'studentProfile:id,first_name,last_name',
                'internshipPlacement:id,internship_posting_id',
                'internshipPlacement.internshipPosting:id,title'
            ])
            ->when($search, function ($q, $search) {
                return $q->whereHas('studentProfile', function ($s) use ($search) {
                    $s->where('first_name', 'like', "%{$search}%")
                      ->orWhere('middle_name', 'like', "%{$search}%")
                      ->orWhere('last_name', 'like', "%{$search}%")
                      ->orWhereRaw("CONCAT_WS(' ', first_name, middle_name, last_name) like ?", ["%{$search}%"]);
                });
            })
            ->latest('submitted_at')
                ->paginate(10);

        $allEvals = Evaluation::whereHas(
            'internshipPlacement',
            fn ($q) => $q->whereIn('internship_posting_id', $postingIds)
        )->get();

        $companyRatings = \App\Models\CompanyRating::where('company_profile_id', $company->id)->latest()->get();

        $evalSummary = [
            'total_evaluated' => $allEvals->count(),
            'average_rating' => $allEvals->isNotEmpty() ? round($allEvals->avg('overall_rating'), 2) : 0,
            'average_equivalent' => $allEvals->isNotEmpty() ? round($allEvals->avg('equivalent_rating'), 1) : 0,
            'recommendations' => [
                'highly_recommended' => $allEvals->where('recommendation', 'highly_recommended')->count(),
                'recommended' => $allEvals->where('recommendation', 'recommended')->count(),
                'needs_improvement' => $allEvals->where('recommendation', 'needs_improvement')->count(),
                'not_recommended' => $allEvals->where('recommendation', 'not_recommended')->count(),
            ],
        ];

        $studentFeedbackSummary = [
            'total_ratings' => $companyRatings->count(),
            'average_rating' => $companyRatings->isNotEmpty() ? round($companyRatings->avg('average_rating'), 2) : 0,
            'recommendation_rate' => $companyRatings->isNotEmpty() ? round(($companyRatings->where('would_recommend', true)->count() / max(1, $companyRatings->count())) * 100) : 0,
            'categories' => [
                'work_environment' => $companyRatings->isNotEmpty() ? round($companyRatings->avg('work_environment'), 2) : 0,
                'mentorship_quality' => $companyRatings->isNotEmpty() ? round($companyRatings->avg('mentorship_quality'), 2) : 0,
                'learning_opportunities' => $companyRatings->isNotEmpty() ? round($companyRatings->avg('learning_opportunities'), 2) : 0,
                'facilities' => $companyRatings->isNotEmpty() ? round($companyRatings->avg('facilities'), 2) : 0,
                'overall_experience' => $companyRatings->isNotEmpty() ? round($companyRatings->avg('overall_experience'), 2) : 0,
            ],
            'recent_feedback' => $companyRatings->take(10)->values(),
        ];

        return $this->ok('Evaluations retrieved.', [
            'data' => $evaluations->items(),
            'current_page' => $evaluations->currentPage(),
            'last_page' => $evaluations->lastPage(),
            'total' => $evaluations->total(),
            'summary' => $evalSummary,
            'student_feedback_summary' => $studentFeedbackSummary,
        ]);
    }

    public function storeEvaluation(Request $request, InternshipPlacement $placement): JsonResponse
    {
        $this->authorizePlacement($request, $placement);

        $requiredHours = (int) ($placement->required_hours ?: SystemSetting::get('default_required_hours', 480));
        if ((int) $placement->rendered_hours < $requiredHours) {
            return response()->json([
                'message' => 'The intern must complete all required rendered hours before an OJT performance evaluation can be submitted.',
                'errors' => [
                    'rendered_hours' => ["The intern has completed {$placement->rendered_hours} of {$requiredHours} required hours."],
                ],
            ], 422);
        }

        $criteriaRules = collect(Evaluation::criteriaFields())
            ->mapWithKeys(fn ($field) => [$field => ['required', 'numeric', 'min:1', 'max:5']])
            ->toArray();

        $validated = $request->validate(array_merge($criteriaRules, [
            'strengths' => ['nullable', 'string', 'max:1000'],
            'areas_for_improvement' => ['nullable', 'string', 'max:1000'],
            'general_comments' => ['nullable', 'string', 'max:2000'],
            'recommendation' => ['nullable', 'in:highly_recommended,recommended,needs_improvement,not_recommended'],
            'rated_by_name' => ['nullable', 'string', 'max:200'],
            'inclusive_training_period' => ['nullable', 'string', 'max:200'],
            'agency_address' => ['nullable', 'string', 'max:500'],
        ]));

        $totalPoints = (int) round(
            collect(Evaluation::criteriaFields())->sum(fn ($f) => (float) $validated[$f])
        );
        $overallRating = round(
            collect(Evaluation::criteriaFields())->average(fn ($f) => (float) $validated[$f]), 2
        );
        $equivalentRating = Evaluation::convertToEquivalentRating($totalPoints);

        $evaluation = Evaluation::updateOrCreate(
            [
                'internship_placement_id' => $placement->id,
                'evaluation_period' => 'final',
            ],
            array_merge($validated, [
                'evaluation_period' => 'final',
                'student_profile_id' => $placement->student_profile_id,
                'evaluated_by' => $request->user()->id,
                'overall_rating' => $overallRating,
                'total_points' => $totalPoints,
                'equivalent_rating' => $equivalentRating,
                'submitted_at' => now(),
            ])
        );

        Notification::send(
            $placement->studentProfile->user_id,
            'evaluation_submitted',
            'Evaluation Submitted',
            "Your OJT completion evaluation has been submitted. Equivalent rating: {$equivalentRating}."
        );

        return $this->ok("Evaluation submitted. Total points: {$totalPoints}/60 — Equivalent rating: {$equivalentRating}.", $evaluation);
    }

    // ── Completion approval ─────────────────────────────────────────────────

    public function completion(Request $request): JsonResponse
    {
        $company = $this->company($request);
        $postingIds = $company->internshipPostings()->pluck('id');

        $placements = InternshipPlacement::whereIn('internship_posting_id', $postingIds)
            ->with(['studentProfile', 'internshipPosting', 'evaluations', 'attendanceLogs'])
            ->whereIn('status', ['active', 'completed'])
            ->latest()
            ->paginate(10);

        return $this->ok('Completion queue retrieved.', $placements);
    }

    public function approveCompletion(Request $request, InternshipPlacement $placement): JsonResponse
    {
        $this->authorizePlacement($request, $placement);

        if ($placement->status === 'completed') {
            return $this->error('This placement is already marked as completed.', 422);
        }

        $validated = $request->validate([
            'completion_notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $placement->update([
            'status' => 'completed',
            'completed_at' => now(),
            'completion_approved_by' => $request->user()->id,
            'completion_notes' => $validated['completion_notes'] ?? null,
        ]);

        Notification::send(
            $placement->studentProfile->user_id,
            'placement_completed',
            'Internship Completed',
            "Congratulations! Your internship at {$placement->internshipPosting->companyProfile->company_name} has been marked as completed by your supervisor."
        );

        return $this->ok('Internship completion approved.', $placement->fresh());
    }

    // ── Match scores ────────────────────────────────────────────────────────

    public function matchScores(Request $request): JsonResponse
    {
        $company = $this->company($request);
        $postingIds = $company->internshipPostings()->pluck('id');

        $applications = Application::with(['studentProfile.skills', 'studentProfile.user', 'internshipPosting'])
            ->whereIn('internship_posting_id', $postingIds)
            ->whereNotIn('status', ['withdrawn'])
            ->get()
            ->map(function ($app) {
                // Calculate match score on-the-fly
                $requiredSkills = array_map('strtolower', $app->internshipPosting->required_skills ?? []);
                $studentSkills = $app->studentProfile->skills
                    ->pluck('name')
                    ->map(fn ($n) => strtolower($n))
                    ->toArray();

                $matched = array_intersect($requiredSkills, $studentSkills);
                $total = count($requiredSkills) ?: 1;

                $courseMatch = !$app->internshipPosting->required_course
                    || stripos($app->studentProfile->course, $app->internshipPosting->required_course) !== false;

                $matchedCount = count($matched);
                $score = $matchedCount === 0
                    ? 0
                    : round(($matchedCount / $total) * 70 + ($courseMatch ? 30 : 0), 0);

                // Add computed fields
                $app->computed_score = $score;
                $app->matched_skills = array_values($matched);
                $app->matched_count = $matchedCount;
                $app->total_required = count($requiredSkills);
                $app->course_match = $courseMatch;

                return $app;
            })
            ->sortByDesc('computed_score')
            ->values(); // Reset array keys

        $perPage = min(10, max(1, (int) $request->input('per_page', 10)));
        $page = max(1, (int) $request->input('page', 1));
        $paginated = new \Illuminate\Pagination\LengthAwarePaginator(
            $applications->forPage($page, $perPage)->values(),
            $applications->count(),
            $perPage,
            $page,
            ['path' => $request->url(), 'query' => $request->query()]
        );

        return $this->ok('Match scores retrieved.', [
            'data' => $paginated,
            'total' => $applications->count(),
        ]);
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    private function company(Request $request): CompanyProfile
    {
        abort_if(! $request->user()?->isCompany() || ! $request->user()->companyProfile, 403);

        return $request->user()->companyProfile;
    }

    private function authorizePlacement(Request $request, InternshipPlacement $placement): void
    {
        $company = $this->company($request);
        abort_if(! $company->internshipPostings()->where('id', $placement->internship_posting_id)->exists(), 403);
    }

    private function authorizeAttendance(Request $request, AttendanceLog $attendanceLog): void
    {
        $attendanceLog->loadMissing('internshipPlacement');
        $this->authorizePlacement($request, $attendanceLog->internshipPlacement);
    }

    private function authorizeJournal(Request $request, JournalEntry $journalEntry): void
    {
        $placement = InternshipPlacement::where('id', $journalEntry->internship_placement_id)->first();
        abort_if(! $placement, 403);
        $this->authorizePlacement($request, $placement);
    }

    private function calculateHours(AttendanceLog $attendanceLog): float
    {
        return round(Carbon::parse($attendanceLog->time_in)->floatDiffInHours(Carbon::parse($attendanceLog->time_out)), 2);
    }

    private function recalculateRenderedHours(InternshipPlacement $placement): void
    {
        $totalHours = $placement->attendanceLogs()
            ->whereNotNull('time_in_approved_at')
            ->whereNotNull('time_out_approved_at')
            ->sum('hours_rendered');

        $placement->update(['rendered_hours' => (int) $totalHours]);
    }
}
