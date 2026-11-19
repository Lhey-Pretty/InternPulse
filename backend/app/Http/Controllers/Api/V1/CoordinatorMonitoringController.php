<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\AuditLog;
use App\Mail\StudentAccountApproved;
use App\Models\CompanyProfile;
use App\Models\Evaluation;
use App\Models\InternshipPlacement;
use App\Models\InternshipPosting;
use App\Models\JournalEntry;
use App\Models\Notification;
use App\Models\StudentProfile;
use App\Support\PersonName;
use App\Support\AcademicPrograms;
use App\Support\AcademicSections;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class CoordinatorMonitoringController extends ApiController
{
    // ── Posting approvals ───────────────────────────────────────────────────

    public function postings(Request $request): JsonResponse
    {
        $program = $request->user()?->coordinatorProfile?->program;
        $postings = InternshipPosting::with('companyProfile')
            ->when($program && isset(AcademicPrograms::PROGRAMS[$program]), fn ($q) => $q->whereHas('companyProfile', fn ($company) => $company->where('program', $program)))
            ->when($request->input('status'), fn ($q, $status) => $q->where('status', $status))
            ->latest()
            ->paginate($this->perPage(request()));

        return $this->ok('Postings retrieved.', $postings);
    }

    public function posting(Request $request, InternshipPosting $posting): JsonResponse
    {
        $program = $request->user()?->coordinatorProfile?->program;
        abort_if($program && $posting->companyProfile?->program !== $program, 403);
        $posting->load('companyProfile');

        return $this->ok('Posting retrieved.', $posting);
    }

    public function approvePosting(Request $request, InternshipPosting $posting): JsonResponse
    {
        $posting->update([
            'status' => 'approved',
            'approved_by' => $request->user()->id,
            'approved_at' => now(),
            'rejection_reason' => null,
        ]);

        Notification::send(
            $posting->companyProfile->user_id,
            'posting_approved',
            'Internship Posting Approved',
            "Your internship posting \"{$posting->title}\" has been approved and is now visible to students."
        );

        AuditLog::record('posting.approved', $posting);

        return $this->ok('Posting approved.', $posting->fresh());
    }

    public function rejectPosting(Request $request, InternshipPosting $posting): JsonResponse
    {
        $validated = $request->validate([
            'rejection_reason' => ['required', 'string', 'max:1000'],
        ]);

        $posting->update([
            'status' => 'rejected',
            'rejection_reason' => $validated['rejection_reason'],
        ]);

        Notification::send(
            $posting->companyProfile->user_id,
            'posting_rejected',
            'Internship Posting Rejected',
            "Your posting \"{$posting->title}\" was rejected. Reason: {$validated['rejection_reason']}"
        );

        AuditLog::record('posting.rejected', $posting);

        return $this->ok('Posting rejected.', $posting->fresh());
    }

    // ── Students ────────────────────────────────────────────────────────────

    public function students(Request $request): JsonResponse
    {
        $request->validate([
            'section' => ['nullable', \Illuminate\Validation\Rule::in(AcademicSections::SECTIONS)],
        ]);

        try {
            $search = $request->input('search', '');
            $status = $request->input('placement_status', '');
            $assignedProgram = $request->user()?->coordinatorProfile?->program;
            $program = $assignedProgram && isset(AcademicPrograms::PROGRAMS[$assignedProgram])
                ? $assignedProgram
                : $request->input('program');

            // Use raw query for maximum speed
            $query = \DB::table('student_profiles as s')
                ->select([
                    's.id',
                    's.user_id',
                    's.first_name',
                    's.middle_name',
                    's.last_name',
                    's.student_id_number',
                    's.course',
                    's.program',
                    's.section',
                    's.year_level',
                    's.school_name',
                    'u.email',
                    'u.name as user_name'
                ])
                ->leftJoin('users as u', 's.user_id', '=', 'u.id');
            $query->addSelect('u.is_active as account_active');

            // Apply search
            if ($search) {
                $query->where(function($q) use ($search) {
                    $q->where('s.first_name', 'like', "%{$search}%")
                      ->orWhere('s.last_name', 'like', "%{$search}%")
                      ->orWhere('s.student_id_number', 'like', "%{$search}%")
                      ->orWhere('s.course', 'like', "%{$search}%")
                      ->orWhereRaw("CONCAT_WS(' ', s.first_name, s.middle_name, s.last_name) like ?", ["%{$search}%"]);
                });
            }

            // Batch / Section filter
            if ($section = $request->input('section')) {
                $query->where('s.section', $section);
            }

            // Assigned coordinators are always scoped to their own program. Legacy
            // unassigned accounts may still filter the global directory.
            if ($program && isset(AcademicPrograms::PROGRAMS[$program])) {
                $programValues = array_values(array_unique([$program, ...AcademicPrograms::PROGRAMS[$program]]));
                $query->where(function ($q) use ($programValues) {
                    $q->whereIn('s.program', $programValues)
                      ->orWhereIn('s.course', $programValues);
                });
            }

            // Apply placement status filter
            if ($status === 'placed') {
                $query->whereExists(function($q) {
                    $q->select(\DB::raw(1))
                      ->from('internship_placements')
                      ->whereColumn('internship_placements.student_profile_id', 's.id')
                      ->where('status', 'active');
                });
            } elseif ($status === 'completed') {
                $query->whereExists(function($q) {
                    $q->select(\DB::raw(1))
                      ->from('internship_placements')
                      ->whereColumn('internship_placements.student_profile_id', 's.id')
                      ->where('status', 'completed');
                });
            } elseif ($status === 'unplaced') {
                $query->whereNotExists(function($q) {
                    $q->select(\DB::raw(1))
                      ->from('internship_placements')
                      ->whereColumn('internship_placements.student_profile_id', 's.id');
                });
            }

            $students = $query->orderBy('s.first_name')->orderBy('s.last_name')->paginate($this->perPage(request()));

            // Get placements for these students in one query
            $studentIds = $students->pluck('id')->toArray();
            $placements = \DB::table('internship_placements as p')
                ->select([
                    'p.id',
                    'p.student_profile_id',
                    'p.status',
                    'p.start_date',
                    'p.end_date',
                    'p.required_hours',
                    'p.rendered_hours',
                    'post.title as posting_title',
                    'c.company_name'
                ])
                ->join('internship_postings as post', 'p.internship_posting_id', '=', 'post.id')
                ->join('company_profiles as c', 'post.company_profile_id', '=', 'c.id')
                ->whereIn('p.student_profile_id', $studentIds)
                ->get()
                ->groupBy('student_profile_id');

            // Get placement recommendations for these students in one query
            $recommendations = \DB::table('placement_recommendations as r')
                ->select([
                    'r.id',
                    'r.student_profile_id',
                    'r.status',
                    'r.reason',
                    'r.requested_start_date',
                    'r.requested_end_date',
                    'r.requested_required_hours',
                    'r.created_at',
                    'post.title as posting_title',
                    'c.company_name'
                ])
                ->join('internship_postings as post', 'r.internship_posting_id', '=', 'post.id')
                ->join('company_profiles as c', 'post.company_profile_id', '=', 'c.id')
                ->whereIn('r.student_profile_id', $studentIds)
                ->orderByDesc('r.created_at')
                ->get()
                ->groupBy('student_profile_id');

            // Attach placements to students
            $data = $students->map(function($student) use ($placements, $recommendations) {
                $studentPlacements = $placements->get($student->id, collect())->map(function($p) {
                    return [
                        'id' => $p->id,
                        'status' => $p->status,
                        'start_date' => $p->start_date,
                        'end_date' => $p->end_date,
                        'required_hours' => $p->required_hours,
                        'rendered_hours' => $p->rendered_hours,
                        'internship_posting' => [
                            'title' => $p->posting_title,
                            'company_profile' => [
                                'company_name' => $p->company_name
                            ]
                        ]
                    ];
                })->toArray();

                $studentRecommendations = $recommendations->get($student->id, collect())->map(function($r) {
                    return [
                        'id' => $r->id,
                        'status' => $r->status,
                        'reason' => $r->reason,
                        'requested_start_date' => $r->requested_start_date,
                        'requested_end_date' => $r->requested_end_date,
                        'requested_required_hours' => $r->requested_required_hours,
                        'created_at' => $r->created_at,
                        'internship_posting' => [
                            'title' => $r->posting_title,
                            'company_profile' => [
                                'company_name' => $r->company_name
                            ]
                        ]
                    ];
                })->toArray();

                return [
                    'id' => $student->id,
                    'first_name' => PersonName::format($student->first_name),
                    'last_name' => PersonName::format($student->last_name),
                    'full_name' => implode(' ', array_filter([
                        PersonName::format($student->first_name),
                        PersonName::format($student->middle_name),
                        PersonName::format($student->last_name),
                    ])),
                    'student_id_number' => $student->student_id_number,
                    'course' => $student->course,
                    'program' => $student->program,
                    'section' => $student->section,
                    'year_level' => $student->year_level,
                    'school_name' => $student->school_name,
                    'account_active' => (bool) $student->account_active,
                    'user' => [
                        'id' => $student->user_id,
                        'name' => PersonName::format($student->user_name),
                        'email' => $student->email
                    ],
                    'placements' => $studentPlacements,
                    'placement_recommendations' => $studentRecommendations
                ];
            });

            return response()->json([
                'success' => true,
                'message' => 'Students retrieved.',
                'data' => [
                    'data' => $data,
                    'current_page' => $students->currentPage(),
                    'last_page' => $students->lastPage(),
                    'total' => $students->total(),
                    'per_page' => $students->perPage(),
                    'section_options' => AcademicSections::SECTIONS,
                    'coordinator_program' => $assignedProgram && isset(AcademicPrograms::PROGRAMS[$assignedProgram]) ? $assignedProgram : null,
                ]
            ]);
        } catch (\Exception $e) {
            \Log::error('Students endpoint error: ' . $e->getMessage() . ' - Line: ' . $e->getLine());
            return response()->json([
                'success' => false,
                'message' => 'Failed to load students: ' . $e->getMessage(),
                'data' => ['data' => [], 'total' => 0]
            ], 500);
        }
    }

    public function approveStudent(Request $request, StudentProfile $studentProfile): JsonResponse
    {
        $user = $request->user();
        abort_if(! $user?->isCoordinator(), 403);
        $assignedProgram = $user->coordinatorProfile?->program;
        abort_if(! $assignedProgram || AcademicPrograms::code($assignedProgram) !== AcademicPrograms::code($studentProfile->program ?? $studentProfile->course), 403);
        $studentProfile->user->update(['is_active' => true]);
        Notification::send($studentProfile->user_id, 'account_approved', 'Student account approved', 'Your student account has been approved. You can now log in.');
        try {
            \Illuminate\Support\Facades\Mail::to($studentProfile->user->email)->send(new StudentAccountApproved($studentProfile->user->name));
        } catch (\Throwable $exception) {
            report($exception);
        }
        AuditLog::record('student.account_approved', $studentProfile, ['approved_by' => $user->id]);
        return $this->ok('Student account approved.');
    }

    public function student(Request $request, StudentProfile $studentProfile): JsonResponse
    {
        try {
            // Load only essential data
            $student = \DB::table('student_profiles as s')
                ->select([
                    's.*',
                    'u.email',
                    'u.name as user_name'
                ])
                ->leftJoin('users as u', 's.user_id', '=', 'u.id')
                ->where('s.id', $studentProfile->id)
                ->first();

            if (!$student) {
                return response()->json(['success' => false, 'message' => 'Student not found'], 404);
            }

            // Get placements
            $placements = \DB::table('internship_placements as p')
                ->select([
                    'p.*',
                    'post.title as posting_title',
                    'c.company_name'
                ])
                ->join('internship_postings as post', 'p.internship_posting_id', '=', 'post.id')
                ->join('company_profiles as c', 'post.company_profile_id', '=', 'c.id')
                ->where('p.student_profile_id', $student->id)
                ->get();

            // Get skills
            $skills = \DB::table('student_skills')
                ->join('skills', 'student_skills.skill_id', '=', 'skills.id')
                ->where('student_skills.student_profile_id', $student->id)
                ->select('skills.id', 'skills.name')
                ->get();

            // Get applications
            $applications = \DB::table('applications as a')
                ->select(['a.id', 'a.status', 'a.applied_at', 'p.id as posting_id', 'p.title', 'c.company_name'])
                ->join('internship_postings as p', 'a.internship_posting_id', '=', 'p.id')
                ->join('company_profiles as c', 'p.company_profile_id', '=', 'c.id')
                ->where('a.student_profile_id', $student->id)
                ->orderBy('a.applied_at', 'desc')
                ->limit(5)
                ->get()
                ->map(function($a) {
                    return [
                        'id' => $a->id,
                        'status' => $a->status,
                        'applied_at' => $a->applied_at,
                        'internship_posting' => [
                            'id' => $a->posting_id,
                            'title' => $a->title,
                            'company_profile' => ['company_name' => $a->company_name]
                        ]
                    ];
                });

            // Get evaluations
            $evaluations = Evaluation::where('student_profile_id', $student->id)
                ->orderByDesc('submitted_at')
                ->get();

            // Get placement recommendations
            $recommendations = \DB::table('placement_recommendations as r')
                ->select([
                    'r.id',
                    'r.status',
                    'r.reason',
                    'r.requested_start_date',
                    'r.requested_end_date',
                    'r.requested_required_hours',
                    'r.coordinator_notes',
                    'r.created_at',
                    'p.id as posting_id',
                    'p.title',
                    'c.company_name'
                ])
                ->join('internship_postings as p', 'r.internship_posting_id', '=', 'p.id')
                ->join('company_profiles as c', 'p.company_profile_id', '=', 'c.id')
                ->where('r.student_profile_id', $student->id)
                ->orderByDesc('r.created_at')
                ->get()
                ->map(function($r) {
                    return [
                        'id' => $r->id,
                        'status' => $r->status,
                        'reason' => $r->reason,
                        'requested_start_date' => $r->requested_start_date,
                        'requested_end_date' => $r->requested_end_date,
                        'requested_required_hours' => $r->requested_required_hours,
                        'coordinator_notes' => $r->coordinator_notes,
                        'created_at' => $r->created_at,
                        'internship_posting' => [
                            'id' => $r->posting_id,
                            'title' => $r->title,
                            'company_profile' => ['company_name' => $r->company_name]
                        ]
                    ];
                });

            $data = (array) $student;
            $data['first_name'] = PersonName::format($student->first_name);
            $data['middle_name'] = PersonName::format($student->middle_name);
            $data['last_name'] = PersonName::format($student->last_name);
            $data['full_name'] = implode(' ', array_filter([$data['first_name'], $data['middle_name'], $data['last_name']]));
            $data['user'] = ['id' => $student->user_id, 'name' => PersonName::format($student->user_name), 'email' => $student->email];
            $data['skills'] = $skills->toArray();
            $data['placements'] = $placements->map(function($p) {
                return [
                    'id' => $p->id,
                    'status' => $p->status,
                    'start_date' => $p->start_date,
                    'end_date' => $p->end_date,
                    'required_hours' => $p->required_hours,
                    'rendered_hours' => $p->rendered_hours,
                    'hours_rendered' => $p->rendered_hours,
                    'completion_percentage' => $p->required_hours > 0 ? round(($p->rendered_hours / $p->required_hours) * 100) : 0,
                    'internship_posting' => [
                        'title' => $p->posting_title,
                        'company_profile' => ['company_name' => $p->company_name]
                    ]
                ];
            })->toArray();
            $data['applications'] = $applications->toArray();
            $data['evaluations'] = $evaluations->toArray();
            $data['placement_recommendations'] = $recommendations->toArray();

            return response()->json([
                'success' => true,
                'message' => 'Student retrieved.',
                'data' => $data
            ]);
        } catch (\Exception $e) {
            \Log::error('Student detail error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to load student: ' . $e->getMessage()
            ], 500);
        }
    }

    // ── Transfer student ────────────────────────────────────────────────────

    public function transferStudent(Request $request, StudentProfile $studentProfile): JsonResponse
    {
        $validated = $request->validate([
            'new_company_id' => 'required|exists:company_profiles,id',
            'new_posting_id' => 'required|exists:internship_postings,id',
            'reason' => 'required|string|max:500',
            'transfer_date' => 'required|date',
        ]);

        try {
            \DB::beginTransaction();

            // Get current active placement
            $currentPlacement = InternshipPlacement::where('student_profile_id', $studentProfile->id)
                ->whereIn('status', ['active', 'ongoing'])
                ->first();

            if (!$currentPlacement) {
                return $this->error('No active placement found for this student.', 404);
            }

            // End current placement
            $currentPlacement->update([
                'status' => 'transferred',
                'end_date' => $validated['transfer_date'],
                'transfer_reason' => $validated['reason'],
                'transferred_at' => now(),
                'transferred_by' => $request->user()->id,
            ]);

            // Create new placement
            $newPlacement = InternshipPlacement::create([
                'student_profile_id' => $studentProfile->id,
                'internship_posting_id' => $validated['new_posting_id'],
                'status' => 'active',
                'start_date' => $validated['transfer_date'],
                'required_hours' => $currentPlacement->required_hours - ($currentPlacement->rendered_hours ?? 0),
                'rendered_hours' => 0,
                'coordinator_id' => $request->user()->id,
            ]);

            // Log the transfer
            AuditLog::create([
                'user_id' => $request->user()->id,
                'action' => 'transfer_student',
                'model' => 'InternshipPlacement',
                'model_id' => $currentPlacement->id,
                'changes' => [
                    'from_placement_id' => $currentPlacement->id,
                    'to_placement_id' => $newPlacement->id,
                    'reason' => $validated['reason'],
                    'transfer_date' => $validated['transfer_date'],
                ],
            ]);

            // Notify student
            Notification::send(
                $studentProfile->user_id,
                'Internship Transfer',
                "Your internship has been transferred. Reason: {$validated['reason']}",
                'transfer',
                ['placement_id' => $newPlacement->id]
            );

            // Notify old company
            if ($currentPlacement->internshipPosting) {
                Notification::send(
                    $currentPlacement->internshipPosting->companyProfile->user_id,
                    'Intern Transferred',
                    "{$studentProfile->first_name} {$studentProfile->last_name} has been transferred to another company.",
                    'transfer',
                    ['placement_id' => $currentPlacement->id]
                );
            }

            // Notify new company
            $newPosting = InternshipPosting::find($validated['new_posting_id']);
            if ($newPosting) {
                Notification::send(
                    $newPosting->companyProfile->user_id,
                    'New Intern Transferred In',
                    "{$studentProfile->first_name} {$studentProfile->last_name} has been transferred to your company.",
                    'transfer',
                    ['placement_id' => $newPlacement->id]
                );
            }

            \DB::commit();

            return $this->ok('Student transferred successfully.', [
                'old_placement' => $currentPlacement,
                'new_placement' => $newPlacement,
            ]);

        } catch (\Exception $e) {
            \DB::rollBack();
            \Log::error('Transfer student error: ' . $e->getMessage());
            return $this->error('Failed to transfer student: ' . $e->getMessage(), 500);
        }
    }

    // ── Journal monitoring ──────────────────────────────────────────────────

    public function journals(Request $request): JsonResponse
    {
        $user = $request->user();
        $assignedProgram = $user?->isCoordinator() ? $user->coordinatorProfile?->program : null;
        $assignedProgram = $assignedProgram && isset(AcademicPrograms::PROGRAMS[$assignedProgram])
            ? $assignedProgram
            : null;

        if ($studentId = $request->integer('student_id')) {
            $query = JournalEntry::with([
                'studentProfile.user',
                'internshipPlacement.internshipPosting.companyProfile',
            ])->where('student_profile_id', $studentId);

            if ($assignedProgram) {
                $this->whereStudentProgram($query, $assignedProgram);
            }
            $this->applyJournalFilters($query, $request);

            $entries = $query->latest('entry_date')->paginate($this->perPage(request()));

            return $this->ok('Journal entries retrieved.', [
                'entries' => $entries,
                'students' => null,
            ]);
        }

        $students = StudentProfile::with('user')
            ->withCount('journals')  // FIXED: was 'journalEntries', should be 'journals'
            ->whereHas('journals')
            ->when($assignedProgram, function ($query) use ($assignedProgram): void {
                $values = array_values(array_unique([$assignedProgram, ...AcademicPrograms::PROGRAMS[$assignedProgram]]));
                $query->where(fn ($q) => $q->whereIn('program', $values)->orWhereIn('course', $values));
            })
            ->when($request->input('course'), function ($query, $program): void {
                if (isset(AcademicPrograms::PROGRAMS[$program])) {
                    $values = array_values(array_unique([$program, ...AcademicPrograms::PROGRAMS[$program]]));
                    $query->where(fn ($q) => $q->whereIn('program', $values)->orWhereIn('course', $values));
                }
            })
            ->orderBy('first_name')
            ->orderBy('last_name')
            ->get();

        return $this->ok('Journal monitoring overview retrieved.', [
            'entries' => null,
            'students' => $students,
            'assigned_program' => $assignedProgram,
        ]);
    }

    public function journal(Request $request, JournalEntry $journalEntry): JsonResponse
    {
        $this->authorizeJournalProgram($request, $journalEntry);
        $journalEntry->load([
            'studentProfile.user',
            'internshipPlacement.internshipPosting.companyProfile',
        ]);

        return $this->ok('Journal entry retrieved.', $journalEntry);
    }

    public function journalRemarks(Request $request, JournalEntry $journalEntry): JsonResponse
    {
        $this->authorizeJournalProgram($request, $journalEntry);
        abort_if(! $journalEntry->entry_date->isToday(), 422, 'Coordinator remarks can only be added on the journal entry date.');

        $validated = $request->validate([
            'supervisor_remarks' => ['required', 'string', 'max:1000'],
        ]);

        $journalEntry->update([
            'supervisor_remarks' => $validated['supervisor_remarks'],
            'is_verified' => true,
        ]);

        Notification::send(
            $journalEntry->studentProfile->user_id,
            'journal_reviewed',
            'Journal Reviewed',
            "Coordinator added remarks to your journal entry \"{$journalEntry->title}\"."
        );

        return $this->ok('Coordinator remarks added.', $journalEntry->fresh());
    }

    private function authorizeJournalProgram(Request $request, JournalEntry $journalEntry): void
    {
        $program = $request->user()?->isCoordinator()
            ? $request->user()->coordinatorProfile?->program
            : null;

        if ($program && isset(AcademicPrograms::PROGRAMS[$program])) {
            $query = JournalEntry::whereKey($journalEntry->id);
            $this->whereStudentProgram($query, $program);
            abort_unless($query->exists(), 404);
        }
    }

    // ── Reports ─────────────────────────────────────────────────────────────

    public function reports(Request $request): JsonResponse
    {
        $averageRating = Evaluation::whereNotNull('overall_rating')->avg('overall_rating');

        $topCompanies = CompanyProfile::withCount(['internshipPostings as interns_count' => fn ($q) => $q->whereHas('placements')])
            ->orderByDesc('interns_count')
            ->take(5)
            ->get();

        return $this->ok('Reports retrieved.', [
            'placements' => [
                'active' => InternshipPlacement::where('status', 'active')->count(),
                'completed' => InternshipPlacement::where('status', 'completed')->count(),
                'terminated' => InternshipPlacement::where('status', 'terminated')->count(),
            ],
            'students' => [
                'total' => StudentProfile::count(),
                'placed' => StudentProfile::whereHas('placements', fn ($q) => $q->whereIn('status', ['active', 'completed']))->count(),
                'unplaced' => StudentProfile::whereDoesntHave('placements')->count(),
            ],
            'companies' => [
                'total' => CompanyProfile::count(),
                'verified' => CompanyProfile::where('verification_status', 'verified')->count(),
                'with_active_interns' => CompanyProfile::whereHas('internshipPostings.placements', fn ($q) => $q->where('status', 'active'))->count(),
            ],
            'average_rating' => $averageRating ? round((float) $averageRating, 2) : null,
            'top_companies' => $topCompanies,
            'pending_postings' => InternshipPosting::where('status', 'pending')->count(),
        ]);
    }

    public function reportItems(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user?->isCoordinator() || $user?->isAdmin(), 403);

        $type = $request->input('type', 'deployment');
        $assignedProgram = $user->isCoordinator() ? $user->coordinatorProfile?->program : null;
        $assignedProgram = $assignedProgram && isset(AcademicPrograms::PROGRAMS[$assignedProgram])
            ? $assignedProgram
            : null;
        // A program coordinator's scope is enforced server-side, even if the client
        // changes or omits the requested program query parameter.
        $course = $assignedProgram ?: $request->input('course');
        $status = $request->input('status');
        $search = $request->input('search');

        if ($type === 'companies') {
            $items = CompanyProfile::with('user')
                ->withCount(['internshipPostings as active_interns_count' => fn ($q) => $q->whereHas('placements', fn ($pq) => $pq->where('status', 'active'))])
                ->withCount('internshipPostings')
                ->when($search, fn ($q) => $q->where('company_name', 'like', "%{$search}%"))
                ->orderBy('company_name')->paginate($this->perPage(request()));
        } elseif ($type === 'evaluations') {
            $items = Evaluation::with(['studentProfile.user', 'internshipPlacement.internshipPosting.companyProfile'])
                ->when($course, fn ($q) => $this->whereStudentProgram($q, $course))
                ->when($search, fn ($q) => $q->whereHas('studentProfile', fn ($s) => $s->where(fn ($x) => $x->where('first_name', 'like', "%{$search}%")->orWhere('last_name', 'like', "%{$search}%"))))
                ->latest('submitted_at')->paginate($this->perPage(request()));
        } else {
            $items = InternshipPlacement::with(['studentProfile.user', 'internshipPosting.companyProfile'])
                ->when($course, fn ($q) => $this->whereStudentProgram($q, $course))
                ->when($status, fn ($q) => $q->where('status', $status))
                ->when($search, fn ($q) => $q->whereHas('studentProfile', fn ($s) => $s->where(fn ($x) => $x->where('first_name', 'like', "%{$search}%")->orWhere('last_name', 'like', "%{$search}%"))))
                ->latest('start_date')->paginate($this->perPage(request()));
        }

        $titles = [
            'deployment' => 'Official OJT Trainee Deployment Masterlist',
            'dtr' => 'Trainee Rendered Hours & DTR Summary',
            'companies' => 'Accredited Partner Companies Directory',
            'evaluations' => 'Student Performance & Evaluation Summary',
        ];

        return $this->ok('Report items retrieved.', [
            'items' => $items,
            'report_type' => $type,
            'report_title' => $titles[$type] ?? $titles['deployment'],
            'assigned_program' => $assignedProgram,
            'dean_name' => $assignedProgram ? \App\Models\SystemSetting::get("signatory_{$assignedProgram}_dean_name", '') : '',
            'dean_title' => $assignedProgram ? \App\Models\SystemSetting::get("signatory_{$assignedProgram}_dean_title", 'COLLEGE DEAN / CAMPUS DIRECTOR') : 'COLLEGE DEAN / CAMPUS DIRECTOR',
        ]);
    }

    public function studentResume(Request $request, StudentProfile $studentProfile): StreamedResponse|JsonResponse
    {
        abort_unless($request->user()?->isCoordinator() || $request->user()?->isAdmin(), 403);

        $resumePath = $studentProfile->resume_path;
        abort_if(! $resumePath || ! Storage::disk('public')->exists($resumePath), 404, 'No resume on file.');

        return Storage::disk('public')->response($resumePath);
    }

    private function applyJournalFilters($query, Request $request): void
    {
        if ($course = $request->input('course')) {
            $this->whereStudentProgram($query, $course);
        }

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('content', 'like', "%{$search}%")
                    ->orWhereHas('studentProfile.user', fn ($u) => $u->where('name', 'like', "%{$search}%"));
            });
        }
    }

    private function whereStudentProgram($query, string $program): void
    {
        if (! isset(AcademicPrograms::PROGRAMS[$program])) {
            return;
        }

        $values = array_values(array_unique([$program, ...AcademicPrograms::PROGRAMS[$program]]));
        $query->whereHas('studentProfile', fn ($student) => $student
            ->whereIn('program', $values)
            ->orWhereIn('course', $values));
    }
}
