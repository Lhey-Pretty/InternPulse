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
        $postingIds = $company->internshipPostings()->withTrashed()->pluck('id');

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
            ->paginate($this->perPage(request()));

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
        ]);

        return $this->ok('Intern details retrieved.', $placement);
    }

    // ── Attendance approvals ────────────────────────────────────────────────

    public function attendanceApprovals(Request $request): JsonResponse
    {
        $company = $this->company($request);
        $postingIds = $company->internshipPostings()->withTrashed()->pluck('id');

        $placements = InternshipPlacement::whereIn('internship_posting_id', $postingIds)
            ->with(['studentProfile', 'internshipPosting', 'attendanceLogs' => fn ($q) => $q->orderByDesc('date')])
            ->where(fn ($q) => $q->where('status', 'active')->orWhereHas('attendanceLogs', fn ($logs) => $logs
                ->whereNull('review_decision')->where(fn ($pending) => $pending->whereNull('time_in_approved_at')->orWhereNull('time_out_approved_at'))))
            ->when($request->input('search'), function ($q, $search) {
                $q->whereHas('studentProfile', fn ($s) => $s
                    ->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('student_id_number', 'like', "%{$search}%"));
            })
            ->latest()
            ->paginate($this->perPage(request()));

        return $this->ok('Attendance approvals retrieved.', $placements);
    }

    public function approveTimeIn(Request $request, AttendanceLog $attendanceLog): JsonResponse
    {
        $this->authorizeAttendance($request, $attendanceLog);
        return $this->ok('Time-in approved.', app(\App\Services\PlacementLifecycleService::class)
            ->approveCompanyAttendance($request->user(), $attendanceLog, false));
    }

    public function approveTimeOut(Request $request, AttendanceLog $attendanceLog): JsonResponse
    {
        $this->authorizeAttendance($request, $attendanceLog);
        return $this->ok('Time-out approved.', app(\App\Services\PlacementLifecycleService::class)
            ->approveCompanyAttendance($request->user(), $attendanceLog, true));
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
        $postingIds = $company->internshipPostings()->withTrashed()->pluck('id');

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
                ->paginate($this->perPage(request()));
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
        $postingIds = $company->internshipPostings()->withTrashed()->pluck('id');
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
                ->paginate($this->perPage(request()));

        $placements = InternshipPlacement::whereIn('internship_posting_id', $postingIds)
            ->whereIn('status', ['active', 'completed'])
            ->with([
                'studentProfile:id,first_name,middle_name,last_name,student_id_number,course',
                'internshipPosting:id,title',
                'evaluations',
            ])
            ->when($search, fn ($q, $term) => $q->whereHas('studentProfile', fn ($s) => $s
                ->where('first_name', 'like', "%{$term}%")
                ->orWhere('middle_name', 'like', "%{$term}%")
                ->orWhere('last_name', 'like', "%{$term}%")
                ->orWhereRaw("CONCAT_WS(' ', first_name, middle_name, last_name) like ?", ["%{$term}%"])))
            ->latest()
            ->get();

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
            'placements' => $placements,
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
        abort_unless((bool) SystemSetting::get('evaluation_editing_enabled', '0'), 403, 'Evaluation editing is currently disabled by the administrator.');

        $requiredHours = (float) $placement->required_hours;
        if ((float) $placement->rendered_hours < $requiredHours) {
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
        $postingIds = $company->internshipPostings()->withTrashed()->pluck('id');

        $placements = InternshipPlacement::whereIn('internship_posting_id', $postingIds)
            ->with(['studentProfile', 'internshipPosting', 'evaluations', 'attendanceLogs'])
            ->whereIn('status', ['active', 'completed'])
            ->latest()
            ->paginate($this->perPage(request()));

        return $this->ok('Completion queue retrieved.', $placements);
    }

    public function approveCompletion(Request $request, InternshipPlacement $placement): JsonResponse
    {
        $this->authorizePlacement($request, $placement);
        $validated = $request->validate(['completion_notes' => ['nullable', 'string', 'max:1000']]);

        return $this->ok('Internship completion approved.', app(\App\Services\PlacementLifecycleService::class)
            ->complete($request->user(), $placement, $validated['completion_notes'] ?? null));
    }

    // ── Match scores ────────────────────────────────────────────────────────

    public function matchScores(Request $request): JsonResponse
    {
        $company = $this->company($request);
        $postingIds = $company->internshipPostings()->withTrashed()->pluck('id');

        $query = Application::with(['studentProfile.skills', 'studentProfile.user', 'internshipPosting'])
            ->whereIn('internship_posting_id', $postingIds)
            ->whereNotIn('status', ['withdrawn']);

        $perPage = $this->perPage($request);
        $total = (clone $query)->count();
        $lastPage = max(1, (int) ceil($total / $perPage));
        $page = min(max(1, (int) $request->input('page', 1)), $lastPage);
        $rankedLimit = min($total, $page * $perPage);
        $ranked = collect();

        // Keep only the highest-ranked records needed for this page in memory.
        // Eager-loaded records are processed in bounded chunks instead of all at once.
        $query->chunkById(250, function ($applications) use (&$ranked, $rankedLimit): void {
            $scored = $applications->map(fn (Application $application) => $this->scoreApplication($application));
            $ranked = $ranked->concat($scored)
                ->sortBy([['computed_score', 'desc'], ['id', 'desc']])
                ->take($rankedLimit)
                ->values();
        });

        $paginated = new \Illuminate\Pagination\LengthAwarePaginator(
            $ranked->slice(($page - 1) * $perPage, $perPage)->values(),
            $total,
            $perPage,
            $page,
            ['path' => $request->url(), 'query' => $request->query()]
        );

        return $this->ok('Match scores retrieved.', [
            'data' => $paginated,
            'total' => $total,
        ]);
    }

    private function scoreApplication(Application $application): Application
    {
        $requiredSkills = array_map('strtolower', $application->internshipPosting->required_skills ?? []);
        $studentSkills = $application->studentProfile->skills
            ->pluck('name')
            ->map(fn ($name) => strtolower($name))
            ->all();
        $matched = array_intersect($requiredSkills, $studentSkills);
        $courseMatch = ! $application->internshipPosting->required_course
            || stripos($application->studentProfile->course, $application->internshipPosting->required_course) !== false;
        $matchedCount = count($matched);

        $application->computed_score = $matchedCount === 0
            ? 0
            : round(($matchedCount / (count($requiredSkills) ?: 1)) * 70 + ($courseMatch ? 30 : 0), 0);
        $application->matched_skills = array_values($matched);
        $application->matched_count = $matchedCount;
        $application->total_required = count($requiredSkills);
        $application->course_match = $courseMatch;

        return $application;
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
        abort_if(! $company->internshipPostings()->withTrashed()->where('id', $placement->internship_posting_id)->exists(), 403);
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
        \Illuminate\Support\Facades\DB::transaction(function () use ($placement) {
            $student = \App\Models\StudentProfile::lockForUpdate()->findOrFail($placement->student_profile_id);
            app(\App\Services\PlacementHoursService::class)->synchronize($student);
        });
    }
}
