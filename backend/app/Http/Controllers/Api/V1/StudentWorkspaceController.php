<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\AttendanceLog;
use App\Models\CompanyRating;
use App\Models\CompanyRequest;
use App\Models\Evaluation;
use App\Models\InternshipPlacement;
use App\Models\InternshipPosting;
use App\Models\InternshipTask;
use App\Models\JournalEntry;
use App\Models\PlacementRecommendation;
use App\Models\Skill;
use App\Models\StudentProfile;
use App\Models\SystemSetting;
use App\Models\WeeklyLog;
use App\Services\JournalClassificationService;
use App\Support\AcademicPrograms;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class StudentWorkspaceController extends ApiController
{
    /**
     * Dashboard overview: active placement + progress snapshot.
     */
    public function overview(Request $request): JsonResponse
    {
        $student = $this->student($request);
        $placement = $this->activePlacement($request);

        if (! $placement) {
            return $this->ok('No active placement.', [
                'placement' => null,
                'stats' => null,
            ]);
        }

        $placement->load(['internshipPosting.companyProfile', 'internshipPosting']);

        return $this->ok('Overview retrieved.', [
            'placement' => $placement,
            'stats' => [
                'rendered_hours' => (int) $placement->rendered_hours,
                'required_hours' => $placement->required_hours,
                'remaining_hours' => $placement->remaining_hours,
                'completion_percentage' => $placement->completion_percentage,
                'journal_entries' => $placement->journalEntries()->count(),
                'pending_tasks' => $placement->tasks()->whereIn('status', ['pending', 'in_progress'])->count(),
                'attendance_days' => $placement->attendanceLogs()->count(),
            ],
        ]);
    }

    // ── Journal entries ─────────────────────────────────────────────────────

    public function evaluationSummary(Request $request): JsonResponse
    {
        $student = $this->student($request);
        
        // Get all evaluations for this student
        $evaluations = Evaluation::where('student_profile_id', $student->id)->get();
        
        if ($evaluations->isEmpty()) {
            return $this->ok('No evaluations found.', [
                'total_evaluations' => 0,
                'average_overall_rating' => 0,
                'average_equivalent_rating' => 0,
                'highest_overall_rating' => 0,
                'grade_description' => null,
                'criteria_averages' => [],
            ]);
        }
        
        $criteria = Evaluation::criteriaFields();
        $criteriaAverages = [];
        
        foreach ($criteria as $field) {
            $values = $evaluations->pluck($field)->filter()->values();
            $criteriaAverages[$field] = $values->isNotEmpty() ? round($values->avg(), 2) : 0;
        }
        
        $avgOverall = round($evaluations->avg('overall_rating'), 2);
        $avgEquivalent = round($evaluations->avg('equivalent_rating'), 2);
        $highest = $evaluations->max('overall_rating');
        
        // Determine grade description based on average equivalent rating
        $gradeDescription = match (true) {
            $avgEquivalent >= 96 => 'Excellent',
            $avgEquivalent >= 90 => 'Very Satisfactory',
            $avgEquivalent >= 84 => 'Satisfactory',
            $avgEquivalent >= 78 => 'Needs Improvement',
            default => 'Poor',
        };
        
        return $this->ok('Evaluation summary retrieved.', [
            'total_evaluations' => $evaluations->count(),
            'average_overall_rating' => $avgOverall,
            'average_equivalent_rating' => $avgEquivalent,
            'highest_overall_rating' => $highest,
            'grade_description' => $gradeDescription,
            'criteria_averages' => $criteriaAverages,
        ]);
    }

    public function journals(Request $request): JsonResponse
    {
        $placement = $this->activePlacement($request);

        $entries = $placement
            ? $placement->journalEntries()->orderByDesc('entry_date')->paginate($this->perPage(request()))
            : collect();

        $todayEntry = $placement
            ? $placement->journalEntries()->where('entry_date', today()->toDateString())->first()
            : null;

        return $this->ok('Journal entries retrieved.', [
            'placement' => $placement ? $placement->only(['id', 'status', 'start_date', 'end_date']) : null,
            'entries' => $entries,
            'today_entry' => $todayEntry,
        ]);
    }

    public function storeJournal(Request $request): JsonResponse
    {
        $student = $this->student($request);
        $placement = $this->activePlacementOrFail($request);

        if (today()->lt($placement->start_date->startOfDay())) {
            return $this->error("Your internship training period officially begins on {$placement->start_date->format('M d, Y')}. You cannot log attendance before your approved start date.", 422);
        }

        $validated = $request->validate([
            'entry_date' => ['required', 'date'],
            'title' => ['required', 'string', 'max:200'],
            'content' => ['required', 'string', 'max:5000'],
            'reflection' => ['nullable', 'string', 'max:2000'],
            'mood' => ['nullable', 'in:excellent,good,neutral,difficult,challenging'],
        ]);

        $entry = JournalEntry::create(array_merge($validated, [
            'internship_placement_id' => $placement->id,
            'student_profile_id' => $student->id,
        ]));

        JournalClassificationService::classifyJournalEntry($entry);

        return $this->ok('Journal entry saved.', $entry);
    }

    public function updateJournal(Request $request, JournalEntry $journalEntry): JsonResponse
    {
        $student = $this->studentOrFail($request);
        abort_if($journalEntry->student_profile_id !== $student->id, 403);
        abort_if(! $journalEntry->entry_date->isToday(), 403, 'Journal entries can only be edited on the day they are created.');

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:200'],
            'content' => ['required', 'string', 'max:5000'],
            'reflection' => ['nullable', 'string', 'max:2000'],
            'mood' => ['nullable', 'in:excellent,good,neutral,difficult,challenging'],
        ]);

        $journalEntry->update($validated);

        JournalClassificationService::classifyJournalEntry($journalEntry);

        return $this->ok('Journal entry updated.', $journalEntry);
    }

    // ── Attendance ──────────────────────────────────────────────────────────

    public function attendance(Request $request): JsonResponse
    {
        $placement = $this->activePlacement($request);

        $logs = $placement
            ? $placement->attendanceLogs()->orderByDesc('date')->paginate($this->perPage(request()))
            : collect();

        $todayLog = $placement
            ? $placement->attendanceLogs()->where('date', today()->toDateString())->first()
            : null;

        if ($placement) {
            $placement->load(['internshipPosting.companyProfile']);
        }

        return $this->ok('Attendance retrieved.', [
            'placement' => $placement,
            'logs' => $logs,
            'today_log' => $todayLog,
        ]);
    }

    public function storeAttendance(Request $request): JsonResponse
    {
        $student = $this->student($request);
        $placement = $this->activePlacementOrFail($request);

        if (today()->lt($placement->start_date->startOfDay())) {
            return $this->error("Your internship training period officially begins on {$placement->start_date->format('M d, Y')}. You cannot log attendance before your approved start date.", 422);
        }

        $exists = $placement->attendanceLogs()->where('date', today()->toDateString())->exists();
        if ($exists) {
            return $this->error('Attendance for today has already been logged.', 422);
        }

        $validated = $request->validate([
            'time_in' => ['required', 'date_format:H:i'],
            'time_out' => ['nullable', 'date_format:H:i', 'after:time_in'],
            'remarks' => ['nullable', 'string', 'max:500'],
        ]);

        $log = AttendanceLog::create([
            'internship_placement_id' => $placement->id,
            'student_profile_id' => $student->id,
            'date' => today()->toDateString(),
            'time_in' => $validated['time_in'],
            'time_out' => $validated['time_out'] ?? null,
            'hours_rendered' => null,
            'status' => 'present',
            'remarks' => $validated['remarks'] ?? null,
        ]);

        $this->recalculateRenderedHours($placement);

        return $this->ok('Attendance logged.', $log);
    }

    public function timeoutAttendance(Request $request, AttendanceLog $attendanceLog): JsonResponse
    {
        $student = $this->studentOrFail($request);
        abort_if($attendanceLog->student_profile_id !== $student->id, 403);

        $validated = $request->validate([
            'time_out' => ['required', 'date_format:H:i'],
        ]);

        $in = Carbon::parse($attendanceLog->time_in);
        $out = Carbon::createFromFormat('H:i', $validated['time_out']);
        $hoursRendered = round($in->floatDiffInHours($out), 2);

        $attendanceLog->update([
            'time_out' => $validated['time_out'],
            'hours_rendered' => $hoursRendered, // Always save calculated hours
            'time_out_approved_at' => null,
            'time_out_approved_by' => null,
        ]);

        $this->recalculateRenderedHours($attendanceLog->internshipPlacement);

        return $this->ok('Time-out recorded.', $attendanceLog->fresh());
    }

    // ── Weekly logs ─────────────────────────────────────────────────────────

    public function weeklyLogs(Request $request): JsonResponse
    {
        $placement = $this->activePlacement($request);

        $logsPage = $placement
            ? $placement->weeklyLogs()->orderByDesc('week_number')->paginate($this->perPage($request))->withQueryString()
            : null;
        $logs = $logsPage?->items() ?? [];

        $nextWeek = null;
        if ($placement) {
            $latestWeek = $placement->weeklyLogs()->max('week_number') ?? 0;
            $nextWeek = [
                'week_number' => $latestWeek + 1,
                'week_start' => $placement->start_date?->copy()->addWeeks($latestWeek)->startOfWeek()?->toDateString(),
                'week_end' => $placement->start_date?->copy()->addWeeks($latestWeek)->startOfWeek()?->endOfWeek()?->toDateString(),
            ];
        }

        if ($placement) {
            $placement->load(['internshipPosting.companyProfile']);
        }

        return $this->ok('Weekly logs retrieved.', [
            'placement' => $placement,
            'logs' => $logs,
            'logs_pagination' => $logsPage ? [
                'current_page' => $logsPage->currentPage(),
                'last_page' => $logsPage->lastPage(),
                'per_page' => $logsPage->perPage(),
                'total' => $logsPage->total(),
            ] : null,
            'next_week' => $nextWeek,
        ]);
    }

    public function storeWeeklyLog(Request $request): JsonResponse
    {
        $student = $this->student($request);
        $placement = $this->activePlacementOrFail($request);

        if (today()->lt($placement->start_date->startOfDay())) {
            return $this->error("Your internship training period officially begins on {$placement->start_date->format('M d, Y')}. You cannot log attendance before your approved start date.", 422);
        }

        $validated = $request->validate([
            'week_number' => ['required', 'integer', 'min:1'],
            'week_start' => ['required', 'date'],
            'week_end' => ['required', 'date', 'after:week_start'],
            'activities_done' => ['required', 'string', 'max:3000'],
            'learnings' => ['nullable', 'string', 'max:2000'],
            'challenges' => ['nullable', 'string', 'max:2000'],
            'hours_this_week' => ['required', 'numeric', 'min:0', 'max:60'],
        ]);

        $exists = $placement->weeklyLogs()->where('week_number', $validated['week_number'])->exists();
        if ($exists) {
            return $this->error("Week {$validated['week_number']} log already submitted.", 422);
        }

        $log = WeeklyLog::create(array_merge($validated, [
            'internship_placement_id' => $placement->id,
            'student_profile_id' => $student->id,
            'status' => 'submitted',
            'submitted_at' => now(),
        ]));

        return $this->ok('Weekly log submitted.', $log);
    }

    // ── Tasks ───────────────────────────────────────────────────────────────

    public function tasks(Request $request): JsonResponse
    {
        $placement = $this->activePlacement($request);

        $page = (int) ($request->input('page') ?? 1);
        $perPage = $this->perPage($request);
        $search = $request->input('search') ?? '';

        if (!$placement) {
            return $this->ok('Tasks retrieved.', [
                'placement' => null,
                'tasks' => [],
                'current_page' => 1,
                'last_page' => 1,
            ]);
        }

        $query = $placement->tasks()->select('id', 'internship_placement_id', 'title', 'description', 'status', 'due_date', 'created_at');
        
        if ($search) {
            $query->where('title', 'like', "%{$search}%")
                ->orWhere('description', 'like', "%{$search}%");
        }

        $tasks = $query->orderBy('due_date')->paginate($perPage, ['*'], 'page', $page);

        return $this->ok('Tasks retrieved.', [
            'placement' => $placement ? $placement->only(['id', 'status']) : null,
            'tasks' => $tasks->items(),
            'current_page' => $tasks->currentPage(),
            'last_page' => $tasks->lastPage(),
            'total' => $tasks->total(),
        ]);
    }

    public function updateTask(Request $request, InternshipTask $task): JsonResponse
    {
        $student = $this->studentOrFail($request);
        abort_if($task->internshipPlacement->student_profile_id !== $student->id, 403);

        $validated = $request->validate([
            'status' => ['required', 'in:pending,in_progress,completed'],
            'student_notes' => ['nullable', 'string', 'max:2000'],
            'output_file' => ['nullable', 'file', 'mimes:pdf,doc,docx,zip,jpg,jpeg,png', 'max:10240'],
        ]);

        $data = [
            'status' => $validated['status'],
            'student_notes' => $validated['student_notes'] ?? $task->student_notes,
        ];

        if ($validated['status'] === 'completed') {
            $data['completed_at'] = now();
        }

        if ($request->hasFile('output_file')) {
            $data['output_file_path'] = $request->file('output_file')->store('task-outputs', 'public');
        }

        $task->update($data);

        return $this->ok('Task updated.', $task->fresh());
    }

    // ── Evaluations & placements ────────────────────────────────────────────

    public function evaluations(Request $request): JsonResponse
    {
        $student = $this->studentOrFail($request);

        $page = (int) ($request->input('page') ?? 1);
        $perPage = $this->perPage($request);
        $search = $request->input('search') ?? '';

        $query = Evaluation::where('student_profile_id', $student->id)
            ->with('internshipPlacement.internshipPosting.companyProfile');
        
        if ($search) {
            $query->whereHas('internshipPlacement.internshipPosting.companyProfile', fn ($q) => $q
                ->where('company_name', 'like', "%{$search}%"));
        }

        $evaluations = $query->latest('submitted_at')->paginate($perPage, ['*'], 'page', $page);

        $allEvals = Evaluation::where('student_profile_id', $student->id)->get();
        $summary = null;
        if ($allEvals->isNotEmpty()) {
            $summary = [
                'count' => $allEvals->count(),
                'average_rating' => round($allEvals->avg('overall_rating'), 2),
                'average_total_points' => round($allEvals->avg('total_points'), 1),
                'average_equivalent' => round($allEvals->avg('equivalent_rating'), 1),
                'criteria_averages' => [
                    'Comprehension' => round($allEvals->avg('comprehension'), 2),
                    'Work Habits and Attitude' => round($allEvals->avg('work_habits'), 2),
                    'Quality of Work' => round($allEvals->avg('work_quality'), 2),
                    'Quantity of Work' => round($allEvals->avg('work_quantity'), 2),
                    'Cooperation' => round($allEvals->avg('cooperation'), 2),
                    'Attendance and Punctuality' => round($allEvals->avg('attendance_punctuality'), 2),
                    'Judgment' => round($allEvals->avg('judgment'), 2),
                    'Attitude' => round($allEvals->avg('attitude'), 2),
                    'Safety' => round($allEvals->avg('safety'), 2),
                    'Honesty and Dependability' => round($allEvals->avg('honesty_dependability'), 2),
                    'Leadership' => round($allEvals->avg('leadership'), 2),
                    'Personal Characteristics' => round($allEvals->avg('personal_characteristics'), 2),
                ],
                'latest' => $allEvals->sortByDesc('submitted_at')->first(),
            ];
        }

        return $this->ok('Evaluations retrieved.', [
            'data' => $evaluations->items(),
            'current_page' => $evaluations->currentPage(),
            'last_page' => $evaluations->lastPage(),
            'total' => $evaluations->total(),
            'summary' => $summary,
        ]);
    }

    public function placements(Request $request): JsonResponse
    {
        $student = $this->studentOrFail($request);

        $placements = $student->placements()
            ->with(['internshipPosting.companyProfile', 'companyRating'])
            ->latest()
            ->get();

        return $this->ok('Placements retrieved.', $placements);
    }

    public function storeCompanyRating(Request $request, InternshipPlacement $placement): JsonResponse
    {
        $student = $this->studentOrFail($request);
        abort_if($placement->student_profile_id !== $student->id, 403);
        abort_if(! in_array($placement->status, ['active', 'completed']), 403, 'You can only evaluate active or completed placements.');
        abort_unless((bool) SystemSetting::get('evaluation_editing_enabled', '0'), 403, 'Evaluation editing is currently disabled by the administrator.');

        $requiredHours = (int) ($placement->required_hours ?: SystemSetting::get('default_required_hours', 480));
        if ((int) $placement->rendered_hours < $requiredHours) {
            return response()->json([
                'message' => 'Complete all required rendered hours before submitting or updating a company evaluation.',
                'errors' => [
                    'rendered_hours' => ["You have completed {$placement->rendered_hours} of {$requiredHours} required hours."],
                ],
            ], 422);
        }

        $validated = $request->validate([
            'work_environment' => ['required', 'numeric', 'min:1', 'max:5'],
            'mentorship_quality' => ['required', 'numeric', 'min:1', 'max:5'],
            'learning_opportunities' => ['required', 'numeric', 'min:1', 'max:5'],
            'facilities' => ['required', 'numeric', 'min:1', 'max:5'],
            'overall_experience' => ['required', 'numeric', 'min:1', 'max:5'],
            'feedback' => ['nullable', 'string', 'max:2000'],
            'would_recommend' => ['boolean'],
        ]);

        $rating = new CompanyRating($validated);
        $avg = $rating->computeAverage();

        $record = CompanyRating::updateOrCreate(
            [
                'internship_placement_id' => $placement->id,
                'rated_by' => $request->user()->id,
            ],
            array_merge($validated, [
                'company_profile_id' => $placement->internshipPosting->companyProfile->id,
                'rater_role' => 'student',
                'average_rating' => $avg,
                'would_recommend' => $request->boolean('would_recommend'),
            ])
        );

        return $this->ok('Company evaluation submitted.', $record);
    }

    // ── Company requests ────────────────────────────────────────────────────

    public function companyRequests(Request $request): JsonResponse
    {
        $requests = CompanyRequest::where('student_user_id', $request->user()->id)
            ->latest()
            ->get();

        return $this->ok('Company requests retrieved.', $requests);
    }

    public function storeCompanyRequest(Request $request): JsonResponse
    {
        $this->studentOrFail($request);

        $validated = $request->validate([
            'company_name' => ['required', 'string', 'max:255'],
            'contact_email' => ['nullable', 'email', 'max:255'],
            'website' => ['nullable', 'url', 'max:255'],
            'reason' => ['nullable', 'string', 'max:2000'],
        ]);

        $companyRequest = CompanyRequest::create(array_merge($validated, [
            'student_user_id' => $request->user()->id,
        ]));

        return $this->ok('Company request submitted for campus review.', $companyRequest);
    }

    // ── Resume ──────────────────────────────────────────────────────────────

    public function resumeDownload(Request $request): StreamedResponse|JsonResponse
    {
        $student = $this->student($request);

        if (! $student?->resume_path || ! Storage::disk('public')->exists($student->resume_path)) {
            return $this->error('No resume on file.', 404);
        }

        return Storage::disk('public')->download(
            $student->resume_path,
            'Resume_'.($student->full_name ?? 'student').'.'.pathinfo($student->resume_path, PATHINFO_EXTENSION)
        );
    }

    // ── Resume upload ───────────────────────────────────────────────────────

    public function uploadResume(Request $request): JsonResponse
    {
        $student = $this->studentOrFail($request);

        $validated = $request->validate([
            'resume' => ['required', 'file', 'mimes:pdf,doc,docx', 'max:5120'],
        ]);

        if ($student->resume_path) {
            Storage::disk('public')->delete($student->resume_path);
        }

        $path = $request->file('resume')->store('resumes', 'public');
        $student->update(['resume_path' => $path]);

        return $this->ok('Resume uploaded.', ['resume_path' => $path]);
    }

    // ── Performance dashboard ───────────────────────────────────────────────

    public function performance(Request $request): JsonResponse
    {
        $student = $this->student($request);

        $placement = $student?->placements()
            ->with(['internshipPosting.companyProfile', 'attendanceLogs', 'tasks', 'evaluations', 'weeklyLogs'])
            ->whereIn('status', ['active', 'completed'])
            ->latest()
            ->first();

        $stats = [
            'rendered_hours' => 0,
            'required_hours' => (int) SystemSetting::get('default_required_hours', 480),
            'completion_pct' => 0,
            'attendance_days' => 0,
            'present_days' => 0,
            'attendance_rate' => 0,
            'total_tasks' => 0,
            'completed_tasks' => 0,
            'task_completion_rate' => 0,
            'weekly_logs' => 0,
            'midterm_rating' => null,
            'final_rating' => null,
            'overall_rating' => null,
        ];

        $attendanceByMonth = [];
        $taskProgress = [];
        $evaluationCriteria = [];

        if ($placement) {
            $logs = $placement->attendanceLogs;
            $tasks = $placement->tasks;

            $stats['rendered_hours'] = $placement->rendered_hours;
            $stats['required_hours'] = $placement->required_hours;
            $stats['completion_pct'] = $placement->completion_percentage;
            $stats['attendance_days'] = $logs->count();
            $stats['present_days'] = $logs->whereIn('status', ['present', 'late', 'half_day'])->count();
            $stats['attendance_rate'] = $stats['attendance_days'] > 0
                ? round(($stats['present_days'] / $stats['attendance_days']) * 100, 1) : 0;
            $stats['total_tasks'] = $tasks->count();
            $stats['completed_tasks'] = $tasks->where('status', 'completed')->count();
            $stats['task_completion_rate'] = $stats['total_tasks'] > 0
                ? round(($stats['completed_tasks'] / $stats['total_tasks']) * 100, 1) : 0;
            $stats['weekly_logs'] = $placement->weeklyLogs->where('status', 'submitted')->count();

            $midterm = $placement->evaluations->where('evaluation_period', 'midterm')->first();
            $final = $placement->evaluations->where('evaluation_period', 'final')->first();
            $stats['midterm_rating'] = $midterm?->overall_rating;
            $stats['final_rating'] = $final?->overall_rating;
            $stats['overall_rating'] = $final?->overall_rating ?? $midterm?->overall_rating;

            $eval = $final ?? $midterm;
            if ($eval) {
                foreach (Evaluation::criteriaFields() as $field) {
                    $evaluationCriteria[Evaluation::criteriaLabels()[$field] ?? $field] = $eval->{$field};
                }
            }

            $attendanceByMonth = $logs->groupBy(fn ($l) => $l->date->format('M Y'))
                ->map(fn ($group) => $group->sum('hours_rendered'))
                ->toArray();

            $taskProgress = [
                'Completed' => $tasks->where('status', 'completed')->count(),
                'In Progress' => $tasks->where('status', 'in_progress')->count(),
                'Pending' => $tasks->where('status', 'pending')->count(),
                'Overdue' => $tasks->filter->isOverdue()->count(),
            ];
        }

        return $this->ok('Performance retrieved.', [
            'placement' => $placement ? $placement->only(['id', 'status', 'start_date', 'end_date']) : null,
            'stats' => $stats,
            'attendance_by_month' => $attendanceByMonth,
            'task_progress' => $taskProgress,
            'evaluation_criteria' => $evaluationCriteria,
        ]);
    }

    // ── Skill recommendations ───────────────────────────────────────────────

    public function skillRecommendations(Request $request): JsonResponse
    {
        $student = $this->studentOrFail($request);

        $studentSkillNames = $student->skills
            ->pluck('name')
            ->map(fn ($name) => strtolower(trim($name)))
            ->filter()
            ->unique()
            ->values()
            ->toArray();

        // Canonical program code (BSIT, BSHM, …). Null when the profile has no course yet.
        $program = AcademicPrograms::code($student->program) ?? AcademicPrograms::code($student->course);

        $postings = InternshipPosting::where('status', 'approved')
            ->whereNotNull('required_skills')
            ->get(['id', 'required_course', 'required_skills']);

        // Without a program, fall back to every approved posting instead of matching
        // the empty string (which used to behave like "%" and mix all courses).
        $relevantPostings = $program
            ? $postings->filter(fn ($posting) => blank($posting->required_course)
                || AcademicPrograms::code($posting->required_course) === $program)
            : $postings;

        $requiredSkillsByPosting = $relevantPostings
            ->pluck('required_skills')
            ->map(fn ($skills) => collect($skills)
                ->map(fn ($skill) => trim((string) $skill))
                ->filter()
                ->unique(fn ($skill) => strtolower($skill))
                ->values());

        $skillGaps = $requiredSkillsByPosting
            ->flatten()
            ->groupBy(fn ($skill) => strtolower($skill))
            ->reject(fn ($skills, $normalizedSkill) => in_array($normalizedSkill, $studentSkillNames, true))
            ->map(fn ($skills) => ['name' => $skills->first(), 'count' => $skills->count()])
            ->sortByDesc('count')
            ->take(3)
            ->values();

        $skillSearch = trim((string) $request->input('search'));
        $suggestedQuery = Skill::query()
            ->whereNotIn('name', $student->skills->pluck('name'));

        // Only restrict to the student's program when it is actually known.
        if ($program) {
            $suggestedQuery->where('category', $program);
        }

        if ($skillSearch !== '') {
            $suggestedQuery->where('name', 'like', "%{$skillSearch}%");
        }

        $suggestedSkills = $suggestedQuery
            ->orderBy('category')
            ->orderBy('name')
            ->paginate($this->perPage(request()));

        return $this->ok('Skill recommendations retrieved.', [
            'program' => $program,
            'profile_incomplete' => $program === null,
            'skill_gaps' => $skillGaps,
            'suggested_skills' => $suggestedSkills,
        ]);
    }

    // ── Completion summary ──────────────────────────────────────────────────

    public function completionSummary(Request $request): JsonResponse
    {
        $student = $this->studentOrFail($request);

        $placements = $student->placements()
            ->with(['internshipPosting.companyProfile', 'attendanceLogs', 'tasks', 'evaluations', 'weeklyLogs', 'companyRating'])
            ->latest()
            ->get();

        $summaries = $placements->map(function ($pl) {
            $logs = $pl->attendanceLogs;
            $tasks = $pl->tasks;
            $evals = $pl->evaluations;
            $final = $evals->where('evaluation_period', 'final')->first() ?? $evals->sortByDesc('submitted_at')->first();
            $required = $pl->required_hours ?: (int) SystemSetting::get('default_required_hours', 480);
            $rendered = (int) $pl->rendered_hours;

            return [
                'placement' => $pl,
                'rendered_hours' => $rendered,
                'required_hours' => $required,
                'completion_pct' => $required > 0 ? min(100, round(($rendered / $required) * 100)) : 0,
                'attendance_days' => $logs->count(),
                'present_days' => $logs->whereIn('status', ['present', 'late', 'half_day'])->count(),
                'total_tasks' => $tasks->count(),
                'completed_tasks' => $tasks->where('status', 'completed')->count(),
                'weekly_logs' => $pl->weeklyLogs->where('status', 'submitted')->count(),
                'final_rating' => $final?->overall_rating,
                'recommendation' => $final?->recommendation,
                'company_rated' => $pl->companyRating !== null,
            ];
        });

        return $this->ok('Completion summary retrieved.', $summaries);
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    public function placementRecommendations(Request $request): JsonResponse
    {
        $profile = $this->studentOrFail($request);

        return $this->ok('Placement recommendations retrieved.', PlacementRecommendation::with(['internshipPosting.companyProfile'])
            ->where('student_profile_id', $profile->id)
            ->latest()
            ->paginate($this->perPage(request())));
    }

    private function student(Request $request): ?StudentProfile
    {
        return $request->user()?->studentProfile;
    }

    private function studentOrFail(Request $request): StudentProfile
    {
        abort_if(! $request->user()?->isStudent(), 403);

        $student = $request->user()->studentProfile;
        abort_if(! $student, 403, 'Student profile not found.');

        return $student;
    }

    private function activePlacement(Request $request): ?InternshipPlacement
    {
        $student = $this->student($request);

        return $student
            ? $student->placements()->where('status', 'active')->latest()->first()
            : null;
    }

    private function activePlacementOrFail(Request $request): InternshipPlacement
    {
        $placement = $this->activePlacement($request);
        abort_if(! $placement, 404, 'No active internship placement found.');

        return $placement;
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
