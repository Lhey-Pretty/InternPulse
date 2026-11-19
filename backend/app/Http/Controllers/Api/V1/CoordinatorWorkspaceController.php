<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\Application;
use App\Models\AuditLog;
use App\Models\CompanyProfile;
use App\Models\InternshipPlacement;
use App\Models\Notification;
use App\Models\PlacementRecommendation;
use App\Models\StudentProfile;
use App\Support\AcademicPrograms;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CoordinatorWorkspaceController extends ApiController
{
    public function overview(Request $request): JsonResponse
    {
        $this->ensureCoordinator($request);

        $program = $request->user()->coordinatorProfile?->program;
        $studentScope = fn ($query) => $query->when($program && isset(AcademicPrograms::PROGRAMS[$program]), function ($q) use ($program) {
            $values = array_values(array_unique([$program, ...AcademicPrograms::PROGRAMS[$program]]));
            $q->where(fn ($student) => $student->whereIn('program', $values)->orWhereIn('course', $values));
        });
        $placementScope = fn ($query) => $query->whereHas('studentProfile', $studentScope);
        $companyScope = fn ($query) => $query->when($program && isset(AcademicPrograms::PROGRAMS[$program]), fn ($q) => $q->where('program', $program));
        $postingScope = fn ($query) => $query->whereHas('companyProfile', $companyScope);

        $stats = [
            'total_students' => $studentScope(StudentProfile::query())->count(),
            'students_on_internship' => $placementScope(InternshipPlacement::where('status', 'active'))->distinct('student_profile_id')->count('student_profile_id'),
            'students_completed' => $placementScope(InternshipPlacement::where('status', 'completed'))->distinct('student_profile_id')->count('student_profile_id'),
            'students_without_placement' => $studentScope(StudentProfile::whereDoesntHave('placements'))->count(),
            'total_companies' => $companyScope(CompanyProfile::query())->count(),
            'verified_companies' => $companyScope(CompanyProfile::where('verification_status', 'verified'))->count(),
            'pending_companies' => $companyScope(CompanyProfile::where('verification_status', 'pending'))->count(),
            'total_postings' => $postingScope(\App\Models\InternshipPosting::query())->count(),
            'pending_postings' => $postingScope(\App\Models\InternshipPosting::where('status', 'pending'))->count(),
            'approved_postings' => $postingScope(\App\Models\InternshipPosting::where('status', 'approved'))->count(),
        ];

        $recentPlacements = InternshipPlacement::with(['studentProfile', 'internshipPosting.companyProfile'])
            ->whereHas('studentProfile', $studentScope)
            ->latest()
            ->take(5)
            ->get();

        $pendingPostings = \App\Models\InternshipPosting::with('companyProfile')
            ->whereHas('companyProfile', $companyScope)
            ->where('status', 'pending')
            ->latest()
            ->take(5)
            ->get();

        return $this->ok('Coordinator overview retrieved successfully.', [
            'stats' => $stats,
            'recent_placements' => $recentPlacements,
            'pending_postings' => $pendingPostings,
        ]);
    }

    public function applications(Request $request): JsonResponse
    {
        try {
            // Check authorization
            if (!$request->user() || !$request->user()->isCoordinator()) {
                return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
            }

            $search = $request->input('search', '');
            $status = $request->input('status', '');
            $coordinatorProgram = $request->user()->coordinatorProfile?->program;
            $programCode = AcademicPrograms::code($coordinatorProgram);

            // Use optimized query with specific columns
            $query = \DB::table('applications as a')
                ->select([
                    'a.id',
                    'a.status',
                    'a.applied_at',
                    'a.cover_letter',
                    's.id as student_id',
                    's.first_name',
                    's.middle_name',
                    's.last_name',
                    's.student_id_number',
                    's.course',
                    'p.id as posting_id',
                    'p.title as posting_title',
                    'c.id as company_id',
                    'c.company_name'
                ])
                ->join('student_profiles as s', 'a.student_profile_id', '=', 's.id')
                ->join('internship_postings as p', 'a.internship_posting_id', '=', 'p.id')
                ->join('company_profiles as c', 'p.company_profile_id', '=', 'c.id');

            if ($programCode) {
                $programValues = array_merge([$programCode], AcademicPrograms::PROGRAMS[$programCode] ?? []);
                $query->where(function ($programQuery) use ($programValues): void {
                    $programQuery->whereIn('s.program', $programValues)
                        ->orWhereIn('s.course', $programValues);
                });
            }

            $statusCounts = (clone $query)
                ->reorder()
                ->select([])
                ->selectRaw('a.status, COUNT(*) as total')
                ->groupBy('a.status')
                ->pluck('total', 'a.status');

            // Apply filters
            if ($status) {
                $query->where('a.status', $status);
            }

            if ($search) {
                $query->where(function($q) use ($search) {
                    $q->where('s.first_name', 'like', "%{$search}%")
                      ->orWhere('s.last_name', 'like', "%{$search}%")
                      ->orWhere('s.middle_name', 'like', "%{$search}%")
                      ->orWhereRaw("CONCAT_WS(' ', s.first_name, s.middle_name, s.last_name) like ?", ["%{$search}%"]);
                });
            }

            $applications = $query->orderBy('a.applied_at', 'desc')->paginate($this->perPage(request()));

            // Transform to match frontend expectations
            $applications->setCollection($applications->getCollection()->map(function($app) {
                return [
                    'id' => $app->id,
                    'status' => $app->status,
                    'applied_at' => $app->applied_at,
                    'cover_letter' => $app->cover_letter,
                    'student_profile' => [
                        'id' => $app->student_id,
                        'first_name' => \App\Support\PersonName::format($app->first_name),
                        'last_name' => \App\Support\PersonName::format($app->last_name),
                        'full_name' => implode(' ', array_filter([
                            \App\Support\PersonName::format($app->first_name),
                            \App\Support\PersonName::format($app->middle_name),
                            \App\Support\PersonName::format($app->last_name),
                        ])),
                        'student_id_number' => $app->student_id_number,
                        'course' => $app->course,
                    ],
                    'internship_posting' => [
                        'id' => $app->posting_id,
                        'title' => $app->posting_title,
                        'company_profile' => [
                            'id' => $app->company_id,
                            'company_name' => $app->company_name,
                        ],
                    ],
                ];
            }));

            return response()->json([
                'success' => true,
                'message' => 'Applications retrieved successfully.',
                'data' => $applications,
                'status_counts' => $statusCounts,
            ]);
        } catch (\Exception $e) {
            \Log::error('Applications error: ' . $e->getMessage() . ' - ' . $e->getTraceAsString());
            return response()->json([
                'success' => false,
                'message' => 'Server error: ' . $e->getMessage(),
                'data' => []
            ], 500);
        }
    }

    public function updateApplication(Request $request, Application $application): JsonResponse
    {
        $this->ensureCoordinator($request);

        $validated = $request->validate([
            'status' => ['required', 'in:pending,shortlisted,interview,accepted,rejected'],
            'rejection_reason' => ['nullable', 'required_if:status,rejected', 'string', 'max:1000'],
        ]);

        $application->update(array_merge($validated, ['reviewed_at' => now()]));
        Notification::send(
            $application->studentProfile->user_id,
            'application_status',
            'Application Update',
            "Your application for {$application->internshipPosting->title} is now {$validated['status']}."
        );

        return $this->ok('Application status updated successfully.', $application->fresh());
    }

    public function companies(Request $request): JsonResponse
    {
        $this->ensureCoordinator($request);

        $perPage = $this->perPage($request);
        $search = $request->input('search', '');
        $program = $request->user()->coordinatorProfile?->program;

        $companies = CompanyProfile::with('user:id,name,email')
            ->when($program && isset(AcademicPrograms::PROGRAMS[$program]), fn ($query) => $query->where('program', $program))
            ->when($request->input('status'), fn ($query, $status) => $query->where('verification_status', $status))
            ->when($search, function ($query, $search) {
                return $query->where('company_name', 'like', "%{$search}%")
                    ->orWhere('contact_email', 'like', "%{$search}%")
                    ->orWhere('industry', 'like', "%{$search}%");
            })
            ->select('id', 'user_id', 'company_name', 'program', 'contact_email', 'industry', 'address', 'city', 'province', 'website', 'verification_status', 'created_at')
            ->latest()
            ->paginate($perPage);

        return $this->ok('Companies retrieved successfully.', $companies);
    }

    public function updateCompany(Request $request, CompanyProfile $companyProfile): JsonResponse
    {
        $this->ensureCoordinator($request);

        $validated = $request->validate([
            'status' => ['required', 'in:verified,rejected,pending'],
            'rejection_reason' => ['nullable', 'required_if:status,rejected', 'string', 'max:1000'],
        ]);

        $companyProfile->update([
            'verification_status' => $validated['status'],
            'rejection_reason' => $validated['rejection_reason'] ?? null,
            'verified_at' => $validated['status'] === 'verified' ? now() : null,
            'verified_by' => $validated['status'] === 'verified' ? $request->user()->id : null,
        ]);
        $companyProfile->user->update(['is_active' => $validated['status'] === 'verified']);
        AuditLog::record("company.{$validated['status']}", $companyProfile);

        return $this->ok('Company verification updated successfully.', $companyProfile->fresh());
    }

    public function placements(Request $request): JsonResponse
    {
        $this->ensureCoordinator($request);

        $placements = InternshipPlacement::with([
            'studentProfile', 'internshipPosting.companyProfile',
        ])
            ->when($request->input('status'), fn ($query, $status) => $query->where('status', $status))
            ->when($request->input('section'), fn ($query, $sec) => $query->whereHas('studentProfile', fn ($q) => $q->where('section', $sec)))
            ->when($request->input('program'), function ($query, $prog): void {
                if (isset(AcademicPrograms::PROGRAMS[$prog])) {
                    $values = array_values(array_unique([$prog, ...AcademicPrograms::PROGRAMS[$prog]]));
                    $query->whereHas('studentProfile', fn ($q) => $q->whereIn('program', $values)->orWhereIn('course', $values));
                }
            })
            ->when($request->input('search'), function ($query, $search): void {
                $query->whereHas('studentProfile', fn ($q) => $q
                    ->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('student_id_number', 'like', "%{$search}%"))
                    ->orWhereHas('internshipPosting.companyProfile', fn ($q) => $q->where('company_name', 'like', "%{$search}%"));
            })
            ->latest()
            ->paginate($this->perPage(request()));

        return $this->ok('Placements retrieved successfully.', $placements);
    }

    public function transferPlacement(Request $request, InternshipPlacement $placement): JsonResponse
    {
        $this->ensureCoordinator($request);

        $validated = $request->validate([
            'new_internship_posting_id' => ['required', 'integer', 'exists:internship_postings,id'],
            'transfer_reason' => ['required', 'string', 'max:1000'],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after:start_date'],
            'required_hours' => ['nullable', 'integer', 'min:1'],
        ]);

        $student = $placement->studentProfile;
        $oldPosting = $placement->internshipPosting;
        $oldCompany = $oldPosting?->companyProfile;

        $newPosting = InternshipPosting::with('companyProfile')->findOrFail($validated['new_internship_posting_id']);
        $newCompany = $newPosting->companyProfile;

        $renderedSoFar = (int) $placement->rendered_hours;
        $remainingHours = $validated['required_hours'] ?? max(1, (int) $placement->required_hours - $renderedSoFar);

        // 1. Terminate old placement with emergency pull-out / transfer note
        $placement->update([
            'status' => 'terminated',
            'termination_reason' => "Emergency Pull-out / Transferred: " . $validated['transfer_reason'] . " (Transferred to {->company_name}). Rendered hours: {}h.",
        ]);

        // 2. Create accepted application record for new posting
        $newApp = Application::create([
            'student_profile_id' => $student->id,
            'internship_posting_id' => $newPosting->id,
            'status' => 'accepted',
            'applied_at' => now(),
            'reviewed_at' => now(),
            'cover_letter' => "Emergency transfer from " . ($oldCompany?->company_name ?? 'Previous Company') . ". Reason: " . $validated['transfer_reason'],
        ]);

        // 3. Create new placement
        $newPlacement = InternshipPlacement::create([
            'student_profile_id' => $student->id,
            'internship_posting_id' => $newPosting->id,
            'application_id' => $newApp->id,
            'approved_by' => $request->user()->id,
            'start_date' => $validated['start_date'],
            'end_date' => $validated['end_date'],
            'required_hours' => $remainingHours,
            'rendered_hours' => 0,
            'status' => 'active',
            'approved_at' => now(),
        ]);

        // 4. Notifications
        Notification::send(
            $student->user_id,
            'placement_transferred',
            'Emergency Transfer to New Company',
            "You have been officially transferred to {->company_name} ({->title}). Remaining hours: {}h. Reason: {['transfer_reason']}."
        );

        if ($oldCompany?->user_id) {
            Notification::send(
                $oldCompany->user_id,
                'intern_pulled_out',
                'Intern Pulled Out / Transferred',
                "Student {->full_name} has been pulled out from your company. Reason: {['transfer_reason']}."
            );
        }

        if ($newCompany?->user_id) {
            Notification::send(
                $newCompany->user_id,
                'intern_transferred_in',
                'Intern Transferred to Company',
                "Student {->full_name} has been transferred and assigned to your company ({->title})."
            );
        }

        AuditLog::record('placement.emergency_transfer', $newPlacement, [
            'from_company' => $oldCompany?->company_name,
            'to_company' => $newCompany->company_name,
            'reason' => $validated['transfer_reason'],
            'carried_hours' => $renderedSoFar,
        ]);

        return $this->ok('Intern transferred and reassigned successfully.', [
            'old_placement' => $placement->fresh(),
            'new_placement' => $newPlacement->load('internshipPosting.companyProfile'),
        ]);
    }

    public function placement(Request $request, InternshipPlacement $placement): JsonResponse
    {
        $this->ensureCoordinator($request);

        $placement->load([
            'studentProfile.user', 'internshipPosting.companyProfile',
            'attendanceLogs' => fn ($q) => $q->orderByDesc('date')->limit(30),
            'tasks', 'evaluations',
        ]);

        return $this->ok('Placement retrieved successfully.', $placement);
    }

    public function company(Request $request, CompanyProfile $companyProfile): JsonResponse
    {
        $this->ensureCoordinator($request);

        $companyProfile->load(['user', 'internshipPostings' => fn ($q) => $q->latest()]);
        $program = $request->user()->coordinatorProfile?->program;
        $program = $program && isset(AcademicPrograms::PROGRAMS[$program]) ? $program : null;

        return $this->ok('Company retrieved successfully.', [
            'company' => $companyProfile,
            'journal_stats' => \App\Services\JournalClassificationService::getCompanyStatistics($companyProfile->id, $program),
        ]);
    }

    public function recommendationOptions(Request $request): JsonResponse
    {
        $this->ensureCoordinator($request);

        // Only get students that:
        // 1. Have active user accounts
        // 2. Don't have an active placement already
        $students = StudentProfile::with('user')
            ->whereHas('user', fn ($q) => $q->where('is_active', true))
            ->whereDoesntHave('placements', fn ($q) => $q->where('status', 'active'))
            ->orderBy('first_name')
            ->get(['id', 'first_name', 'last_name', 'student_id_number', 'user_id']);

        $postings = \App\Models\InternshipPosting::with('companyProfile')
            ->where('status', 'approved')
            ->orderBy('title')
            ->get(['id', 'title', 'company_profile_id']);

        return $this->ok('Recommendation options retrieved.', [
            'students' => $students,
            'postings' => $postings,
        ]);
    }

    public function recommendations(Request $request): JsonResponse
    {
        $this->ensureCoordinator($request);

        return $this->ok('Placement recommendations retrieved successfully.', PlacementRecommendation::with([
            'studentProfile', 'internshipPosting.companyProfile',
        ])->when($request->input('status'), fn ($query, $status) => $query->where('status', $status), fn ($query) => $query->where('status', 'pending'))
            ->latest()->paginate($this->perPage(request())));
    }

    public function storeRecommendation(Request $request): JsonResponse
    {
        $this->ensureCoordinator($request);

        $validated = $request->validate([
            'student_profile_id' => ['required', 'exists:student_profiles,id'],
            'internship_posting_id' => ['required', 'exists:internship_postings,id'],
            'application_id' => ['nullable', 'exists:applications,id'],
            'reason' => ['nullable', 'string', 'max:1000'],
        ]);

        // Try to find an existing application
        $application = Application::query()
            ->where('student_profile_id', $validated['student_profile_id'])
            ->where('internship_posting_id', $validated['internship_posting_id'])
            ->when($validated['application_id'] ?? null, fn ($query, $id) => $query->whereKey($id))
            ->first();

        // If application exists, use it; otherwise, coordinator can manually assign without application
        $recommendation = PlacementRecommendation::create(array_merge($validated, [
            'application_id' => $application?->id, // Optional - can be null for manual assignments
            'recommended_by' => $request->user()->id,
            'source' => 'coordinator',
            'status' => 'pending',
        ]));

        $student = StudentProfile::findOrFail($validated['student_profile_id']);
        Notification::send($student->user_id, 'placement_recommendation', 'Placement Recommendation', 'A placement recommendation is ready for your review.');

        return $this->ok('Placement recommendation created.', $recommendation->load('studentProfile', 'internshipPosting'));
    }

    public function confirmRecommendation(Request $request, PlacementRecommendation $recommendation): JsonResponse
    {
        $this->ensureCoordinator($request);
        abort_if($recommendation->status !== 'pending', 422, 'Recommendation has already been processed.');
        abort_if(
            InternshipPlacement::where('application_id', $recommendation->application_id)->exists(),
            422,
            'This application already has a placement.'
        );

        $validated = $request->validate([
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after:start_date'],
            'required_hours' => ['required', 'integer', 'min:1'],
            'coordinator_notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $placement = DB::transaction(function () use ($recommendation, $validated, $request): InternshipPlacement {
            $placement = InternshipPlacement::create([
                'student_profile_id' => $recommendation->student_profile_id,
                'internship_posting_id' => $recommendation->internship_posting_id,
                'application_id' => $recommendation->application_id,
                'approved_by' => $request->user()->id,
                'start_date' => $validated['start_date'],
                'end_date' => $validated['end_date'],
                'required_hours' => $validated['required_hours'],
                'rendered_hours' => 0,
                'status' => 'active',
                'approved_at' => now(),
            ]);
            $recommendation->application()->update([
                'status' => 'accepted',
                'reviewed_at' => now(),
            ]);
            $recommendation->update([
                'status' => 'confirmed',
                'coordinator_notes' => $validated['coordinator_notes'] ?? null,
                'confirmed_at' => now(),
            ]);

            return $placement;
        });

        return $this->ok('Placement confirmed successfully.', $placement->load('studentProfile', 'internshipPosting'));
    }

    public function rejectRecommendation(Request $request, PlacementRecommendation $recommendation): JsonResponse
    {
        $this->ensureCoordinator($request);
        abort_if($recommendation->status !== 'pending', 422, 'Recommendation has already been processed.');

        $validated = $request->validate(['reason' => ['nullable', 'string', 'max:1000']]);

        $recommendation->update([
            'status' => 'rejected',
            'coordinator_notes' => $validated['reason'] ?? null,
        ]);

        $studentId = $recommendation->studentProfile?->user_id;
        if ($studentId) {
            Notification::send($studentId, 'placement_recommendation', 'Placement Recommendation Declined', 'Your placement recommendation was declined by the coordinator.');
        }

        return $this->ok('Recommendation rejected.', $recommendation->fresh());
    }

    public function profile(Request $request): JsonResponse
    {
        $this->ensureCoordinator($request);

        $coordinator = $request->user()->coordinatorProfile;
        if (! $coordinator) {
            $coordinator = new \App\Models\CoordinatorProfile;
            $coordinator->user_id = $request->user()->id;
        }

        return $this->ok('Coordinator profile retrieved.', $coordinator);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $this->ensureCoordinator($request);

        $validated = $request->validate([
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'middle_name' => ['nullable', 'string', 'max:100'],
            'employee_id' => ['nullable', 'string', 'max:50'],
            'department' => ['nullable', 'string', 'max:200'],
            'phone_number' => ['nullable', 'string', 'max:20'],
        ]);

        $user = $request->user();

        $profile = \Illuminate\Support\Facades\DB::transaction(function () use ($user, $validated) {
            $profile = $user->coordinatorProfile;
            if ($profile) {
                $profile->update($validated);
                $profile->refresh();
            } else {
                $profile = \App\Models\CoordinatorProfile::create(array_merge($validated, ['user_id' => $user->id]));
            }

            $user->name = implode(' ', array_filter([
                $profile->first_name,
                $profile->middle_name,
                $profile->last_name,
            ]));
            $user->save();

            return $profile;
        });

        return $this->ok('Profile updated successfully.', $profile->fresh());
    }

    private function ensureCoordinator(Request $request): void
    {
        abort_if(! $request->user()?->isCoordinator(), 403);
    }
}
