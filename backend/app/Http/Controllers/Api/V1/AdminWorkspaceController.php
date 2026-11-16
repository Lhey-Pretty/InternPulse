<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\AuditLog;
use App\Models\CompanyProfile;
use App\Models\CompanyRequest;
use App\Models\CoordinatorProfile;
use App\Models\Evaluation;
use App\Models\InternshipPlacement;
use App\Models\Skill;
use App\Models\SystemSetting;
use App\Models\User;
use App\Support\AcademicPrograms;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class AdminWorkspaceController extends ApiController
{
    public function users(Request $request): JsonResponse
    {
        $this->ensureAdmin($request);
        $users = User::query()->with('coordinatorProfile')
            ->when($request->input('search'), fn ($q, $s) => $q->where(fn ($x) => $x->where('name', 'like', "%{$s}%")->orWhere('email', 'like', "%{$s}%")))
            ->when($request->input('role'), fn ($q, $role) => $q->where('role', $role))
            ->when($request->boolean('inactive_only'), fn ($q) => $q->where('is_active', false))
            ->latest()->paginate(10);

        return $this->ok('Users retrieved successfully.', $users);
    }

    public function exportUsers(Request $request): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        $this->ensureAdmin($request);
        $users = User::query()
            ->when($request->input('search'), fn ($q, $s) => $q->where(fn ($x) => $x->where('name', 'like', "%{$s}%")->orWhere('email', 'like', "%{$s}%")))
            ->when($request->input('role'), fn ($q, $role) => $q->where('role', $role))
            ->orderBy('name')->get();

        return response()->streamDownload(function () use ($users) {
            $out = fopen('php://output', 'w');
            fputcsv($out, ['Name', 'Email', 'Role', 'Status', 'Date Joined']);
            foreach ($users as $u) {
                fputcsv($out, [$u->name, $u->email, $u->role, $u->is_active ? 'Active' : 'Inactive', $u->created_at?->format('Y-m-d')]);
            }
            fclose($out);
        }, 'internpulse-users-' . now()->format('Ymd') . '.csv', ['Content-Type' => 'text/csv']);
    }

    public function updateUser(Request $request, User $user): JsonResponse
    {
        $this->ensureAdmin($request);
        abort_if($user->id === $request->user()->id, 422, 'You cannot change your own account here.');
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email,' . $user->id],
            'role' => ['required', 'in:student,company,coordinator,admin'],
            'is_active' => ['required', 'boolean'],
            'password' => ['nullable', Password::defaults(), 'max:255'],
            'program' => [
                'required_if:role,coordinator',
                'nullable',
                'string',
                Rule::in(array_keys(AcademicPrograms::PROGRAMS)),
                Rule::unique('coordinator_profiles', 'program')->ignore($user->coordinatorProfile?->id),
            ],
        ]);
        $isPlaceholder = (bool) $user->coordinatorProfile?->is_placeholder;
        $placeholderIsConfigured = $isPlaceholder
            && ! str_starts_with(strtolower(trim($validated['name'])), 'unassigned ')
            && ! str_ends_with(strtolower($validated['email']), '.invalid')
            && ! empty($validated['password']);
        if ($isPlaceholder && $request->boolean('is_active') && ! $placeholderIsConfigured) {
            return $this->error('Replace the placeholder name and email, and set an initial password before activating this coordinator account.', 422);
        }

        $data = collect($validated)->except('password')->all();
        unset($data['program']);
        if (! empty($validated['password'])) {
            $data['password'] = Hash::make($validated['password']);
            $data['password_changed_at'] = now();
        }
        $user->update($data);
        if ($user->role === 'coordinator') {
            $this->syncCoordinatorProfile($user, $validated['program'], $isPlaceholder && ! $placeholderIsConfigured);
        } elseif ($user->coordinatorProfile) {
            $user->coordinatorProfile->update(['program' => null]);
        }
        AuditLog::record('user.updated', $user, ['role' => $user->role, 'is_active' => $user->is_active, 'program' => $validated['program'] ?? null]);

        return $this->ok('User updated successfully.', $user->fresh()->load('coordinatorProfile'));
    }

    public function students(Request $request): JsonResponse
    {
        $this->ensureAdmin($request);

        $query = \App\Models\StudentProfile::with(['user', 'placements.internshipPosting.companyProfile'])
            ->when($request->input('search'), function ($q, $search): void {
                $q->where(fn ($x) => $x
                    ->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('student_id_number', 'like', "%{$search}%")
                    ->orWhere('course', 'like', "%{$search}%"));
            });

        match ($request->input('placement_status')) {
            'placed' => $query->whereHas('placements', fn ($q) => $q->where('status', 'active')),
            'completed' => $query->whereHas('placements', fn ($q) => $q->where('status', 'completed')),
            'unplaced' => $query->whereDoesntHave('placements'),
            default => null,
        };

        $students = $query->latest()->paginate(10);

        $stats = [
            'total' => \App\Models\StudentProfile::count(),
            'placed' => \App\Models\StudentProfile::whereHas('placements', fn ($q) => $q->where('status', 'active'))->count(),
            'completed' => \App\Models\StudentProfile::whereHas('placements', fn ($q) => $q->where('status', 'completed'))->count(),
            'unplaced' => \App\Models\StudentProfile::whereDoesntHave('placements')->count(),
        ];

        return $this->ok('Students retrieved successfully.', ['students' => $students, 'stats' => $stats]);
    }

    public function student(Request $request, \App\Models\StudentProfile $studentProfile): JsonResponse
    {
        $this->ensureAdmin($request);

        $studentProfile->load([
            'user', 'skills',
            'placements.internshipPosting.companyProfile',
            'placements.evaluations', 'placements.attendanceLogs',
            'applications.internshipPosting.companyProfile',
        ]);

        return $this->ok('Student retrieved successfully.', [
            'student' => $studentProfile,
            'active_placement' => $studentProfile->placements->where('status', 'active')->first(),
        ]);
    }

    public function sessionLogs(Request $request): JsonResponse
    {
        $this->ensureAdmin($request);

        $logs = \App\Models\SessionLog::with('user')->latest()
            ->when($request->input('search'), fn ($q, $s) => $q->where('email', 'like', "%{$s}%"))
            ->when($request->input('event'), fn ($q, $e) => $q->where('event', $e))
            ->paginate(10);

        // "Active" means a JWT was used for an API call recently.
        $activeCount = \App\Models\JwtToken::query()
            ->where('last_used_at', '>=', now()->subMinutes(30))
            ->where('expires_at', '>', now())
            ->whereNull('revoked_at')
            ->distinct('user_id')
            ->count('user_id');

        return $this->ok('Session logs retrieved successfully.', ['logs' => $logs, 'active_count' => $activeCount]);
    }

    public function mlDashboard(Request $request): JsonResponse
    {
        $this->ensureAdmin($request);

        $stats = [
            'unplaced_students' => \App\Models\StudentProfile::whereDoesntHave('placements', fn ($query) => $query->where('status', 'active'))->count(),
            'partner_companies' => CompanyProfile::where('verification_status', 'verified')
                ->whereHas('user', fn ($query) => $query->where('is_active', true))->count(),
            'total_placements' => InternshipPlacement::count(),
            'avg_system_rating' => round((float) Evaluation::whereNotNull('overall_rating')->avg('overall_rating'), 2),
        ];

        $students = \App\Models\StudentProfile::with('skills')
            ->whereDoesntHave('placements', fn ($query) => $query->where('status', 'active'))
            ->take(20)->get();
        $postings = \App\Models\InternshipPosting::with('companyProfile')
            ->where('status', 'approved')
            ->whereHas('companyProfile', function ($query): void {
                $query->where('verification_status', 'verified')
                    ->whereHas('user', fn ($userQuery) => $userQuery->where('is_active', true));
            })->get();

        $recommendations = [];
        foreach ($students as $student) {
            $studentSkills = $student->skills->pluck('name')->map(fn ($name) => strtolower($name))->toArray();
            $best = $postings->map(function ($posting) use ($student, $studentSkills) {
                $requiredSkills = array_map('strtolower', $posting->required_skills ?? []);
                $matched = count(array_intersect($requiredSkills, $studentSkills));
                $total = count($requiredSkills) ?: 1;
                $courseMatch = ! $posting->required_course || stripos($student->course, $posting->required_course) !== false;
                return ['posting' => $posting, 'score' => round(($matched / $total) * 70 + ($courseMatch ? 30 : 0), 0)];
            })->sortByDesc('score')->first();

            if ($best) {
                $recommendations[] = [
                    'student' => $student, 'posting' => $best['posting'],
                    'company' => $best['posting']->companyProfile, 'score' => $best['score'],
                ];
            }
        }
        usort($recommendations, fn ($a, $b) => $b['score'] <=> $a['score']);
        $recommendations = array_slice($recommendations, 0, 5);

        $companyPerformance = InternshipPlacement::with(['internshipPosting.companyProfile', 'evaluations'])
            ->get()
            ->groupBy(fn ($p) => $p->internshipPosting?->company_profile_id)
            ->map(function ($placements) {
                $company = $placements->first()->internshipPosting?->companyProfile;
                $ratings = $placements->flatMap->evaluations->whereNotNull('overall_rating');
                if (! $company || $ratings->isEmpty()) {
                    return null;
                }
                $company->intern_count = $ratings->count();
                $company->avg_eval_rating = round((float) $ratings->avg('overall_rating'), 2);
                return $company;
            })->filter()->sortByDesc('avg_eval_rating')->take(5)->values();

        return $this->ok('ML dashboard data retrieved.', [
            'stats' => $stats,
            'recommendations' => $recommendations,
            'company_performance' => $companyPerformance,
        ]);
    }

    public function companies(Request $request): JsonResponse
    {
        $this->ensureAdmin($request);
        $companies = CompanyProfile::with('user')->withAvg('ratings', 'average_rating')
            ->when($request->filled('status') && $request->input('status') !== 'all', fn ($q) => $q->where('verification_status', $request->input('status')))
            ->latest()->paginate(10);

        return $this->ok('Companies retrieved successfully.', $companies);
    }

    public function company(Request $request, CompanyProfile $companyProfile): JsonResponse
    {
        $this->ensureAdmin($request);
        $companyProfile->load(['user', 'internshipPostings', 'ratings']);

        return $this->ok('Company retrieved successfully.', [
            'company' => $companyProfile,
            'average_rating' => $companyProfile->averageRating(),
            'rating_count' => $companyProfile->ratings()->count(),
            'rating_distribution' => collect([5, 4, 3, 2, 1])->mapWithKeys(fn ($star) => [
                $star => $companyProfile->ratings()
                    ->where('average_rating', '>=', $star - 0.5)
                    ->where('average_rating', '<', $star + 0.5)
                    ->count(),
            ]),
        ]);
    }

    public function storeCompany(Request $request): JsonResponse
    {
        $this->ensureAdmin($request);
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'unique:users,email'],
            'password' => ['required', Password::min(8)],
            'is_temporary' => ['boolean'],
            'access_starts_at' => ['nullable', 'date'],
            'access_ends_at' => ['nullable', 'date', 'after:access_starts_at'],
            'company_name' => ['required', 'string', 'max:200'],
            'industry' => ['nullable', 'string', 'max:100'],
            'description' => ['nullable', 'string'],
            'address' => ['required', 'string', 'max:500'],
            'city' => ['nullable', 'string', 'max:100'],
            'province' => ['nullable', 'string', 'max:100'],
            'website' => ['nullable', 'url', 'max:200'],
            'contact_person' => ['nullable', 'string', 'max:100'],
            'contact_phone' => ['nullable', 'string', 'max:20'],
            'contact_email' => ['nullable', 'email', 'max:200'],
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'password_changed_at' => now(),
            'role' => 'company',
            'is_active' => true,
            'is_temporary' => $request->boolean('is_temporary'),
            'access_starts_at' => $validated['access_starts_at'] ?? null,
            'access_ends_at' => $validated['access_ends_at'] ?? null,
            'email_verified_at' => now(),
        ]);

        $company = CompanyProfile::create([
            'user_id' => $user->id,
            'company_name' => $validated['company_name'],
            'industry' => $validated['industry'] ?? null,
            'description' => $validated['description'] ?? null,
            'address' => $validated['address'],
            'city' => $validated['city'] ?? null,
            'province' => $validated['province'] ?? null,
            'website' => $validated['website'] ?? null,
            'contact_person' => $validated['contact_person'] ?? null,
            'contact_phone' => $validated['contact_phone'] ?? null,
            'contact_email' => $validated['contact_email'] ?? null,
            'verification_status' => 'verified',
            'verified_at' => now(),
            'verified_by' => $request->user()->id,
        ]);

        AuditLog::record('admin.company.created', $company, [
            'company_name' => $validated['company_name'],
            'email' => $validated['email'],
            'is_temporary' => $request->boolean('is_temporary'),
        ]);

        return $this->ok('Company created successfully.', $company->load('user'));
    }

    public function updateCompany(Request $request, CompanyProfile $companyProfile): JsonResponse
    {
        $this->ensureAdmin($request);
        $validated = $request->validate([
            'company_name' => ['required', 'string', 'max:200'],
            'industry' => ['nullable', 'string', 'max:100'],
            'description' => ['nullable', 'string'],
            'address' => ['required', 'string', 'max:500'],
            'city' => ['nullable', 'string', 'max:100'],
            'province' => ['nullable', 'string', 'max:100'],
            'website' => ['nullable', 'url', 'max:200'],
            'contact_person' => ['nullable', 'string', 'max:100'],
            'contact_phone' => ['nullable', 'string', 'max:20'],
            'contact_email' => ['nullable', 'email', 'max:200'],
            'is_temporary' => ['boolean'],
            'access_starts_at' => ['nullable', 'date'],
            'access_ends_at' => ['nullable', 'date', 'after_or_equal:access_starts_at'],
        ]);

        $companyProfile->update(collect($validated)->except(['is_temporary', 'access_starts_at', 'access_ends_at'])->toArray());
        $companyProfile->user->update([
            'is_temporary' => $request->boolean('is_temporary'),
            'access_starts_at' => $validated['access_starts_at'] ?? null,
            'access_ends_at' => $validated['access_ends_at'] ?? null,
        ]);
        AuditLog::record('admin.company.updated', $companyProfile);

        return $this->ok('Company updated.', $companyProfile->fresh('user'));
    }

    public function toggleCompanyActive(Request $request, CompanyProfile $companyProfile): JsonResponse
    {
        $this->ensureAdmin($request);
        $user = $companyProfile->user;
        $user->update(['is_active' => ! $user->is_active]);
        AuditLog::record('admin.company.' . ($user->is_active ? 'activated' : 'deactivated'), $companyProfile);

        return $this->ok('Company ' . ($user->is_active ? 'activated' : 'deactivated') . ' successfully.', $companyProfile->fresh('user'));
    }

    public function updateCompanyVerification(Request $request, CompanyProfile $companyProfile): JsonResponse
    {
        $this->ensureAdmin($request);
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
        AuditLog::record("admin.company.{$validated['status']}", $companyProfile);

        return $this->ok('Company verification updated successfully.', $companyProfile->fresh('user'));
    }

    public function auditLogs(Request $request): JsonResponse
    {
        $this->ensureAdmin($request);
        return $this->ok('Audit logs retrieved successfully.', AuditLog::with('user')
            ->when($request->input('search'), fn ($q, $search) => $q->where('action', 'like', "%{$search}%"))
            ->latest()->paginate(10));
    }

    public function reports(Request $request): JsonResponse
    {
        $this->ensureAdmin($request);
        return $this->ok('Reports retrieved successfully.', [
            'users' => [
                'total' => User::count(),
                'students' => User::where('role', 'student')->count(),
                'companies' => User::where('role', 'company')->count(),
                'coordinators' => User::where('role', 'coordinator')->count(),
            ],
            'placements' => [
                'active' => InternshipPlacement::where('status', 'active')->count(),
                'completed' => InternshipPlacement::where('status', 'completed')->count(),
                'terminated' => InternshipPlacement::where('status', 'terminated')->count(),
            ],
            'companies' => [
                'verified' => CompanyProfile::where('verification_status', 'verified')->count(),
                'pending' => CompanyProfile::where('verification_status', 'pending')->count(),
            ],
            'students' => [
                'total' => \App\Models\StudentProfile::count(),
                'on_internship' => \App\Models\StudentProfile::whereHas('placements', fn ($q) => $q->where('status', 'active'))->count(),
                'unplaced' => \App\Models\StudentProfile::whereDoesntHave('placements')->count(),
            ],
            'postings' => [
                'approved' => \App\Models\InternshipPosting::where('status', 'approved')->count(),
                'pending' => \App\Models\InternshipPosting::where('status', 'pending')->count(),
            ],
            'applications' => [
                'total' => \App\Models\Application::count(),
                'pending' => \App\Models\Application::where('status', 'pending')->count(),
            ],
            'evaluations' => [
                'count' => Evaluation::count(),
                'average' => round((float) Evaluation::avg('overall_rating'), 2),
            ],
            'average_evaluation' => round((float) Evaluation::avg('overall_rating'), 2),
        ]);
    }

    public function settings(Request $request): JsonResponse
    {
        $this->ensureAdmin($request);
        return $this->ok('Settings retrieved successfully.', SystemSetting::orderBy('group')->orderBy('label')->get());
    }

    public function updateSettings(Request $request): JsonResponse
    {
        $this->ensureAdmin($request);
        $validated = $request->validate(['settings' => ['required', 'array']]);
        $allowed = SystemSetting::pluck('key')->all();
        $unknown = array_diff(array_keys($validated['settings']), $allowed);
        abort_if($unknown, 422, 'One or more settings are not recognized.');

        if (array_key_exists('password_expiry_days', $validated['settings'])) {
            $days = $validated['settings']['password_expiry_days'];
            $integerDays = filter_var((string) $days, FILTER_VALIDATE_INT);
            abort_if($integerDays === false || $integerDays < 0 || $integerDays > 3650, 422, 'Password expiration must be 0 (disabled) or between 1 and 3650 days.');
        }
        foreach (['password_auth_enabled', 'google_auth_enabled'] as $authSetting) {
            if (array_key_exists($authSetting, $validated['settings'])
                && ! in_array($validated['settings'][$authSetting], [true, false, 0, 1, '0', '1'], true)) {
                abort(422, 'Authentication settings must be enabled or disabled.');
            }
        }
        $isEnabled = static fn (mixed $value): bool => in_array($value, [true, 1, '1'], true);
        $passwordAuthEnabled = $isEnabled($validated['settings']['password_auth_enabled'] ?? SystemSetting::get('password_auth_enabled', '1'));
        $googleAuthEnabled = $isEnabled($validated['settings']['google_auth_enabled'] ?? SystemSetting::get('google_auth_enabled', '0'));
        abort_if(! $passwordAuthEnabled && ! $googleAuthEnabled, 422, 'At least one sign-in method must remain enabled.');
        abort_if($googleAuthEnabled && ! config('services.google.client_id'), 422, 'Set GOOGLE_CLIENT_ID in backend/.env before enabling Google sign-in.');

        foreach ($validated['settings'] as $key => $value) {
            if ($key === 'login_max_attempts' && (! is_numeric($value) || (int) $value < 1 || (int) $value > 20)) {
                abort(422, 'Maximum login attempts must be between 1 and 20.');
            }
            if ($key === 'login_cooldown_minutes' && (! is_numeric($value) || (int) $value < 1 || (int) $value > 10080)) {
                abort(422, 'Login cooldown must be between 1 minute and 7 days.');
            }
            $storedValue = is_bool($value) ? ($value ? '1' : '0') : (is_scalar($value) ? (string) $value : json_encode($value));
            SystemSetting::set($key, $storedValue);
        }
        AuditLog::record('admin.settings.updated', null, array_keys($validated['settings']));

        return $this->ok('Settings saved successfully.', SystemSetting::orderBy('group')->orderBy('label')->get());
    }

    public function rubrics(Request $request): JsonResponse
    {
        $defaultStudentRubric = [
            ['key' => 'comprehension', 'label' => 'Comprehension', 'description' => 'Quickly grasps instructions, procedures, and concepts.', 'max' => 5],
            ['key' => 'work_habits', 'label' => 'Work Habits and Attitude', 'description' => 'Shows initiative, diligence, and positive work ethic.', 'max' => 5],
            ['key' => 'work_quality', 'label' => 'Quality of Work', 'description' => 'Accuracy, neatness, and thoroughness in outputs.', 'max' => 5],
            ['key' => 'work_quantity', 'label' => 'Quantity of Work', 'description' => 'Volume of work completed within expected timeframes.', 'max' => 5],
            ['key' => 'cooperation', 'label' => 'Cooperation', 'description' => 'Works well with supervisors and colleagues.', 'max' => 5],
            ['key' => 'attendance_punctuality', 'label' => 'Attendance and Punctuality', 'description' => 'Regular attendance and on-time arrival.', 'max' => 5],
            ['key' => 'judgment', 'label' => 'Judgment', 'description' => 'Sound decision-making and problem-solving ability.', 'max' => 5],
            ['key' => 'attitude', 'label' => 'Attitude', 'description' => 'Professionalism, openness to feedback and suggestions.', 'max' => 5],
            ['key' => 'safety', 'label' => 'Safety', 'description' => 'Adherence to workplace safety protocols and guidelines.', 'max' => 5],
            ['key' => 'honesty_dependability', 'label' => 'Honesty and Dependability', 'description' => 'Trustworthiness, integrity, and accountability.', 'max' => 5],
            ['key' => 'leadership', 'label' => 'Leadership', 'description' => 'Ability to guide, assist, and inspire peers when needed.', 'max' => 5],
            ['key' => 'personal_characteristics', 'label' => 'Personal Characteristics', 'description' => 'Grooming, poise, emotional stability, and demeanor.', 'max' => 5],
        ];

        $defaultCompanyRubric = [
            ['key' => 'work_environment', 'label' => 'Work Environment', 'description' => 'Safe, professional, conducive, and welcoming office or job site.', 'max' => 5],
            ['key' => 'mentorship_quality', 'label' => 'Mentorship Quality', 'description' => 'Supervisors provide helpful training, guidance, and constructive feedback.', 'max' => 5],
            ['key' => 'learning_opportunities', 'label' => 'Learning Opportunities', 'description' => 'Meaningful tasks aligned with academic program and career goals.', 'max' => 5],
            ['key' => 'facilities', 'label' => 'Facilities and Tools', 'description' => 'Adequate equipment, software, workspace, and resources provided.', 'max' => 5],
            ['key' => 'overall_experience', 'label' => 'Overall Experience', 'description' => 'General satisfaction with the company internship program.', 'max' => 5],
        ];

        $studentRubricRaw = SystemSetting::get('evaluation_rubric_student');
        $studentRubric = $studentRubricRaw ? json_decode($studentRubricRaw, true) : null;

        $companyRubricRaw = SystemSetting::get('evaluation_rubric_company');
        $companyRubric = $companyRubricRaw ? json_decode($companyRubricRaw, true) : null;

        return $this->ok('Evaluation rubrics retrieved successfully.', [
            'student_rubric' => $studentRubric ?: $defaultStudentRubric,
            'company_rubric' => $companyRubric ?: $defaultCompanyRubric,
        ]);
    }

    public function updateRubrics(Request $request): JsonResponse
    {
        $this->ensureAdmin($request);

        $validated = $request->validate([
            'student_rubric' => ['required', 'array', 'min:1'],
            'student_rubric.*.key' => ['required', 'string'],
            'student_rubric.*.label' => ['required', 'string'],
            'student_rubric.*.description' => ['nullable', 'string'],
            'company_rubric' => ['required', 'array', 'min:1'],
            'company_rubric.*.key' => ['required', 'string'],
            'company_rubric.*.label' => ['required', 'string'],
            'company_rubric.*.description' => ['nullable', 'string'],
        ]);

        SystemSetting::set('evaluation_rubric_student', json_encode($validated['student_rubric']));
        SystemSetting::set('evaluation_rubric_company', json_encode($validated['company_rubric']));

        AuditLog::record('admin.rubrics.updated', null, [
            'student_criteria_count' => count($validated['student_rubric']),
            'company_criteria_count' => count($validated['company_rubric']),
        ]);

        return $this->rubrics($request);
    }

    public function skills(Request $request): JsonResponse
    {
        $this->ensureAdmin($request);

        return $this->ok('Skills retrieved successfully.', Skill::query()
            ->when($request->input('search'), fn ($query, $search) => $query->where(function ($skills) use ($search) {
                $skills->where('name', 'like', "%{$search}%")
                    ->orWhere('canonical_name', 'like', "%{$search}%");
            }))
            ->when($request->has('is_active'), fn ($query) => $query->where('is_active', $request->boolean('is_active')))
            ->when($request->input('category'), fn ($query, $category) => $query->where('category', $category))
            ->orderBy('category')->orderBy('name')->paginate(10));
    }

    protected array $skillPrograms = [
        'BSIT' => ['name' => 'BS in Information Technology', 'department' => 'College of Computer Studies', 'icon' => '💻'],
        'BSCPE' => ['name' => 'BS in Computer Engineering', 'department' => 'College of Engineering & Technology', 'icon' => '⚙️'],
        'BSHM' => ['name' => 'BS in Hospitality Management', 'department' => 'College of Hospitality & Tourism', 'icon' => '🏨'],
        'BSTM' => ['name' => 'BS in Tourism Management', 'department' => 'College of Hospitality & Tourism', 'icon' => '✈️'],
        'BSCRIM' => ['name' => 'BS in Criminology', 'department' => 'College of Criminal Justice Education', 'icon' => '🛡️'],
        'FISHERIES' => ['name' => 'BS in Fisheries', 'department' => 'College of Fisheries & Aquatic Sciences', 'icon' => '🐟'],
        'POLSCI' => ['name' => 'BA in Political Science', 'department' => 'College of Arts and Sciences', 'icon' => '⚖️'],
        'BEED' => ['name' => 'Bachelor of Elementary Education', 'department' => 'College of Teacher Education', 'icon' => '📚'],
        'BSED_MATH' => ['name' => 'BSED - Major in Mathematics', 'department' => 'College of Teacher Education', 'icon' => '📐'],
        'BSED_SCIENCE' => ['name' => 'BSED - Major in Science', 'department' => 'College of Teacher Education', 'icon' => '🔬'],
        'BSED_ENGLISH' => ['name' => 'BSED - Major in English', 'department' => 'College of Teacher Education', 'icon' => '📖'],
    ];

    public function skillsHub(Request $request): JsonResponse
    {
        $this->ensureAdmin($request);
        $counts = Skill::selectRaw('category, count(*) as count')->groupBy('category')->pluck('count', 'category')->toArray();
        $sampleSkills = [];
        $skillsByProgram = [];
        foreach (array_keys($this->skillPrograms) as $progKey) {
            $sampleSkills[$progKey] = Skill::where('category', $progKey)->orderBy('name')->take(4)->pluck('name')->toArray();
            $skillsByProgram[$progKey] = Skill::where('category', $progKey)->orderBy('name')->get(['id', 'name', 'category']);
        }

        return $this->ok('Skills hub retrieved.', [
            'programs' => $this->skillPrograms,
            'counts' => $counts,
            'sample_skills' => $sampleSkills,
            'skills_by_program' => $skillsByProgram,
            'total_skills' => Skill::count(),
        ]);
    }

    public function exportSkills(Request $request): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        $this->ensureAdmin($request);
        $category = $request->input('category');
        $query = Skill::withCount('students');
        if ($category) $query->where('category', $category);
        $skills = $query->orderBy('category')->orderBy('name')->get();
        $filename = $category ? "MinSU_Skills_{$category}_" . date('Y-m-d') . '.csv' : 'MinSU_Master_Skills_Matrix_' . date('Y-m-d') . '.csv';

        return response()->stream(function () use ($skills) {
            $file = fopen('php://output', 'w');
            fprintf($file, chr(0xEF) . chr(0xBB) . chr(0xBF));
            fputcsv($file, ['ID', 'Academic Program', 'Skill Name', 'Number of Students with that Skill']);
            foreach ($skills as $skill) {
                fputcsv($file, [$skill->id, $skill->category, $skill->name, $skill->students_count]);
            }
            fclose($file);
        }, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ]);
    }

    public function importSkills(Request $request): JsonResponse
    {
        $this->ensureAdmin($request);
        $request->validate(['skills_file' => ['required', 'file', 'mimes:csv,txt', 'max:10240']]);
        $handle = fopen($request->file('skills_file')->getRealPath(), 'r');
        if (! $handle) return $this->ok('Unable to open the uploaded file.', [], 422);
        $header = fgetcsv($handle);
        if (! $header) { fclose($handle); return $this->ok('The uploaded file is empty.', [], 422); }
        $header[0] = preg_replace('/[\xEF\xBB\xBF]/', '', $header[0]);
        $header = array_map(fn ($h) => strtolower(trim($h)), $header);
        $idIdx = array_search('id', $header);
        $programIdx = false; $skillIdx = false;
        foreach ($header as $idx => $col) {
            if (str_contains($col, 'program') || str_contains($col, 'category') || str_contains($col, 'course')) $programIdx = $idx;
            if ((str_contains($col, 'skill') || str_contains($col, 'name') || str_contains($col, 'competency'))
                && ! str_contains($col, 'student') && ! str_contains($col, 'number') && ! str_contains($col, 'intern') && ! str_contains($col, 'count')) $skillIdx = $idx;
        }
        if ($programIdx === false || $skillIdx === false) { $programIdx = 1; $skillIdx = 2; }

        $processed = 0; $created = 0; $updated = 0;
        while (($row = fgetcsv($handle)) !== false) {
            if (empty($row) || count($row) < 2) continue;
            $category = trim($row[$programIdx] ?? '');
            $name = trim($row[$skillIdx] ?? '');
            $skillId = ($idIdx !== false && ! empty($row[$idIdx])) ? (int) $row[$idIdx] : null;
            if (empty($name) || empty($category)) continue;
            if ($skillId && ($existing = Skill::find($skillId))) {
                $existing->update(['name' => $name, 'category' => $category]);
                $updated++; $processed++; continue;
            }
            $skill = Skill::updateOrCreate(['name' => $name], ['category' => $category]);
            $skill->wasRecentlyCreated ? $created++ : $updated++;
            $processed++;
        }
        fclose($handle);
        AuditLog::record('admin.skills.imported', null, ['processed' => $processed, 'created' => $created, 'updated' => $updated]);

        return $this->ok("Successfully synced Excel skills! Processed: {$processed} ({$created} new, {$updated} updated).", [
            'processed' => $processed, 'created' => $created, 'updated' => $updated,
        ]);
    }

    public function storeSkill(Request $request): JsonResponse
    {
        $this->ensureAdmin($request);
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150', 'unique:skills,name'],
            'canonical_name' => ['nullable', 'string', 'max:150'],
            'category' => ['nullable', 'string', 'max:100'],
            'aliases' => ['nullable', 'array'],
            'aliases.*' => ['string', 'max:150'],
            'source' => ['nullable', 'string', 'max:100'],
            'is_active' => ['sometimes', 'boolean'],
            'is_matchable' => ['sometimes', 'boolean'],
        ]);
        $validated['canonical_name'] = $validated['canonical_name'] ?? $validated['name'];
        $validated['is_active'] = $validated['is_active'] ?? true;
        $validated['is_matchable'] = $validated['is_matchable'] ?? true;
        $validated['approved_at'] = $validated['is_active'] ? now() : null;
        $skill = Skill::create($validated);
        AuditLog::record('admin.skill.created', $skill, ['source' => $skill->source]);

        return $this->ok('Skill created successfully.', $skill);
    }

    public function updateSkill(Request $request, Skill $skill): JsonResponse
    {
        $this->ensureAdmin($request);
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150', 'unique:skills,name,' . $skill->id],
            'canonical_name' => ['nullable', 'string', 'max:150'],
            'category' => ['nullable', 'string', 'max:100'],
            'aliases' => ['nullable', 'array'],
            'aliases.*' => ['string', 'max:150'],
            'source' => ['nullable', 'string', 'max:100'],
            'is_active' => ['required', 'boolean'],
            'is_matchable' => ['required', 'boolean'],
        ]);
        $validated['canonical_name'] = $validated['canonical_name'] ?? $validated['name'];
        $validated['approved_at'] = $validated['is_active'] ? ($skill->approved_at ?? now()) : null;
        $validated['is_matchable'] = $validated['is_matchable'] ?? $skill->is_matchable;
        $skill->update($validated);
        AuditLog::record('admin.skill.updated', $skill, ['is_active' => $skill->is_active]);

        return $this->ok('Skill updated successfully.', $skill->fresh());
    }

    public function deleteSkill(Request $request, Skill $skill): JsonResponse
    {
        $this->ensureAdmin($request);
        $skill->update(['is_active' => false, 'approved_at' => null]);
        AuditLog::record('admin.skill.deactivated', $skill);

        return $this->ok('Skill deactivated successfully.', $skill->fresh());
    }

    public function storeUser(Request $request): JsonResponse
    {
        $this->ensureAdmin($request);
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', Password::defaults(), 'max:255'],
            'role' => ['required', 'in:student,company,coordinator,admin'],
            'program' => [
                'required_if:role,coordinator',
                'nullable',
                'string',
                Rule::in(array_keys(AcademicPrograms::PROGRAMS)),
                Rule::unique('coordinator_profiles', 'program'),
            ],
        ]);
        $user = DB::transaction(function () use ($validated) {
            $user = User::create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'password' => Hash::make($validated['password']),
                'password_changed_at' => now(),
                'role' => $validated['role'],
                'is_active' => true,
            ]);

            if ($user->role === 'coordinator') {
                $this->syncCoordinatorProfile($user, $validated['program']);
            }

            return $user->load('coordinatorProfile');
        });
        AuditLog::record('user.created', $user, ['role' => $user->role]);

        return $this->ok('User created successfully.', $user);
    }

    public function deleteUser(Request $request, User $user): JsonResponse
    {
        $this->ensureAdmin($request);
        abort_if($user->id === $request->user()->id, 422, 'You cannot delete your own account.');
        $user->delete();
        AuditLog::record('user.deleted', $user);

        return $this->ok('User deleted successfully.');
    }

    public function companyRequests(Request $request): JsonResponse
    {
        $this->ensureAdmin($request);

        return $this->ok('Company requests retrieved.', CompanyRequest::with('student')->latest()->paginate(10));
    }

    public function reviewCompanyRequest(Request $request, CompanyRequest $companyRequest): JsonResponse
    {
        $this->ensureAdmin($request);
        abort_if($companyRequest->status !== 'pending', 422, 'This request has already been reviewed.');

        $validated = $request->validate([
            'status' => ['required', 'in:approved,rejected'],
            'review_notes' => ['required_if:status,rejected', 'nullable', 'string', 'max:2000'],
        ]);

        $temporaryPassword = null;
        if ($validated['status'] === 'approved') {
            abort_if(! $companyRequest->contact_email, 422, 'A company contact email is required before approval.');
            abort_if(User::where('email', $companyRequest->contact_email)->exists(), 422, 'This contact email already belongs to an account.');

            $temporaryPassword = Str::password(16);
            $companyUser = DB::transaction(function () use ($request, $companyRequest, $temporaryPassword) {
                $companyUser = User::create([
                    'name' => $companyRequest->company_name,
                    'email' => $companyRequest->contact_email,
                    'password' => Hash::make($temporaryPassword),
                    'password_changed_at' => now(),
                    'role' => 'company',
                    'is_active' => true,
                    'must_change_password' => true,
                    'email_verified_at' => now(),
                ]);
                CompanyProfile::create([
                    'user_id' => $companyUser->id,
                    'company_name' => $companyRequest->company_name,
                    'website' => $companyRequest->website,
                    'contact_email' => $companyRequest->contact_email,
                    'verification_status' => 'verified',
                    'verified_at' => now(),
                    'verified_by' => $request->user()->id,
                ]);
                $companyRequest->update([
                    'status' => 'approved',
                    'reviewed_by' => $request->user()->id,
                    'reviewed_at' => now(),
                ]);
                AuditLog::record('admin.company_request.approved', $companyRequest, ['company_user_id' => $companyUser->id]);

                return $companyUser;
            });

            return $this->ok('Company approved. Share the temporary password with the company.', [
                'company_request' => $companyRequest->fresh('student'),
                'login_email' => $companyUser->email,
                'temporary_password' => $temporaryPassword,
            ]);
        }

        $companyRequest->update([
            'status' => 'rejected',
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
            'review_notes' => $validated['review_notes'],
        ]);
        AuditLog::record('admin.company_request.rejected', $companyRequest, $validated);

        return $this->ok('Company request rejected.', $companyRequest->fresh('student'));
    }

    private function ensureAdmin(Request $request): void
    {
        abort_if(! $request->user()?->isAdmin(), 403);
    }

    private function syncCoordinatorProfile(User $user, string $program, bool $isPlaceholder = false): void
    {
        $nameParts = preg_split('/\s+/', trim($user->name), 2) ?: [$user->name];
        CoordinatorProfile::updateOrCreate(
            ['user_id' => $user->id],
            [
                'first_name' => $nameParts[0] ?? $user->name,
                'last_name' => $nameParts[1] ?? '',
                'program' => $program,
                'is_placeholder' => $isPlaceholder,
            ]
        );
    }
}
