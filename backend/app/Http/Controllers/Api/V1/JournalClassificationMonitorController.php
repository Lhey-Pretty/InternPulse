<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\CompanyProfile;
use App\Models\CompanyRating;
use App\Services\JournalClassificationService;
use App\Support\AcademicPrograms;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class JournalClassificationMonitorController extends ApiController
{
    /**
     * Get all companies with journal classification statistics.
     * Used by coordinator frontend to monitor journal quality.
     * 
     * GET /api/v1/coordinator/journal-classification
     * Query params: filter (all|flagged|needs_review)
     */
    public function index(Request $request): JsonResponse
    {
        $filterStatus = $request->input('filter', 'all');
        $program = $this->assignedProgram($request);
        $placementScope = function ($query) use ($program): void {
            $query->whereIn('status', ['active', 'completed']);
            if ($program) {
                $values = array_values(array_unique([$program, ...AcademicPrograms::PROGRAMS[$program]]));
                $query->whereHas('studentProfile', fn ($student) => $student
                    ->whereIn('program', $values)
                    ->orWhereIn('course', $values));
            }
        };

        // Show companies hosting active/completed interns in this coordinator's program.
        $companies = CompanyProfile::whereHas('internshipPostings.placements', $placementScope)
            ->with(['internshipPostings' => fn ($query) => $query->whereHas('placements', $placementScope)])
            ->get();

        // Aggregate statistics for every company in one query.
        $statsByCompany = JournalClassificationService::getCompanyStatisticsForCompanies($companies->modelKeys(), $program);
        $companyStats = $companies->map(function ($company) use ($statsByCompany) {
            $stats = $statsByCompany[$company->id];
            
            return [
                'company_id' => $company->id,
                'company_name' => $company->company_name,
                'industry' => $company->industry,
                'verification_status' => $company->verification_status,
                'eligibility_status' => $company->eligibility_status ?? 'pending',
                'stats' => $stats,
            ];
        });

        // Overall classified journal activities across companies in this coordinator's scope.
        $journalTasks = [
            'related' => (int) $companyStats->sum('stats.related_entries'),
            'unrelated' => (int) $companyStats->sum('stats.unrelated_entries'),
            'unclassified' => (int) $companyStats->sum('stats.unclassified_entries'),
            'students_count' => (int) $companyStats->sum('stats.students_count'),
        ];
        $journalTasks['total'] = $journalTasks['related'] + $journalTasks['unrelated'];
        $journalTasks['related_percentage'] = $journalTasks['total'] > 0
            ? round(($journalTasks['related'] / $journalTasks['total']) * 100, 2)
            : 0;
        $journalTasks['unrelated_percentage'] = $journalTasks['total'] > 0
            ? round(($journalTasks['unrelated'] / $journalTasks['total']) * 100, 2)
            : 0;

        // Include every company with at least one student-submitted evaluation,
        // even if it has no active placement anymore.
        $evaluatedCompanies = CompanyRating::query()
            ->join('company_profiles', 'company_ratings.company_profile_id', '=', 'company_profiles.id')
            ->where('company_ratings.rater_role', 'student')
            ->when($program, function ($query) use ($program): void {
                $values = array_values(array_unique([$program, ...AcademicPrograms::PROGRAMS[$program]]));
                $query->whereExists(function ($subquery) use ($values): void {
                    $subquery->selectRaw('1')
                        ->from('internship_placements as rated_placement')
                        ->join('internship_postings as rated_posting', 'rated_placement.internship_posting_id', '=', 'rated_posting.id')
                        ->join('student_profiles as rated_student', 'rated_placement.student_profile_id', '=', 'rated_student.id')
                        ->whereColumn('rated_placement.id', 'company_ratings.internship_placement_id')
                        ->whereColumn('rated_posting.company_profile_id', 'company_ratings.company_profile_id')
                        ->where(fn ($student) => $student
                            ->whereIn('rated_student.program', $values)
                            ->orWhereIn('rated_student.course', $values));
                });
            })
            ->select([
                'company_profiles.id as company_id',
                'company_profiles.company_name',
                'company_profiles.industry',
            ])
            ->selectRaw('COUNT(company_ratings.id) as evaluation_count')
            ->selectRaw('ROUND(AVG(company_ratings.average_rating), 2) as average_rating')
            ->selectRaw('SUM(CASE WHEN company_ratings.would_recommend = 1 THEN 1 ELSE 0 END) as recommendation_count')
            ->groupBy('company_profiles.id', 'company_profiles.company_name', 'company_profiles.industry')
            ->orderBy('company_profiles.company_name')
            ->get();

        // Sort by unrelated percentage (highest first)
        $companyStats = $companyStats->sortByDesc('stats.unrelated_percentage')->values();

        // Apply filters
        if ($filterStatus === 'flagged') {
            $companyStats = $companyStats->filter(fn($item) => $item['stats']['flagged_entries'] > 0)->values();
        } elseif ($filterStatus === 'needs_review') {
            $companyStats = $companyStats->filter(fn($item) => $item['stats']['needs_review'])->values();
        }

        return response()->json([
            'companies' => $companyStats,
            'journal_tasks' => $journalTasks,
            'evaluated_companies' => $evaluatedCompanies,
            'assigned_program' => $program,
            'filter' => $filterStatus,
            'summary' => [
                'total_companies' => $companies->count(),
                'flagged_companies' => $companyStats->filter(fn($i) => $i['stats']['flagged_entries'] > 0)->count(),
                'needs_review_companies' => $companyStats->filter(fn($i) => $i['stats']['needs_review'])->count(),
            ],
        ]);
    }

    /**
     * Get detailed journal entries for a specific company.
     * 
     * GET /api/v1/coordinator/journal-classification/{company_id}
     * Query params: level (all|unrelated|warning|normal), page
     */
    public function show(Request $request, int $companyId): JsonResponse
    {
        $company = CompanyProfile::findOrFail($companyId);
        $program = $this->assignedProgram($request);
        $stats = JournalClassificationService::getCompanyStatistics($companyId, $program);

        $filterLevel = $request->input('level', 'all');
        $perPage = $this->perPage($request);

        // Get all journal entries from interns at this company
        $query = \DB::table('journal_entries as je')
            ->join('internship_placements as ip', 'je.internship_placement_id', '=', 'ip.id')
            ->join('internship_postings as posting', 'ip.internship_posting_id', '=', 'posting.id')
            ->join('student_profiles as sp', 'je.student_profile_id', '=', 'sp.id')
            ->join('users', 'sp.user_id', '=', 'users.id')
            ->where('posting.company_profile_id', $companyId)
            ->when($program, function ($q) use ($program): void {
                $values = array_values(array_unique([$program, ...AcademicPrograms::PROGRAMS[$program]]));
                $q->where(fn ($student) => $student->whereIn('sp.program', $values)->orWhereIn('sp.course', $values));
            })
            ->select([
                'je.id',
                'je.entry_date',
                'je.title',
                'je.content',
                'je.is_related',
                'je.confidence_score',
                'je.flag_level',
                'je.classification_feedback',
                'je.detected_tasks',
                'users.name as student_name',
                'sp.student_id_number as student_id',
                'sp.course as course_code',
            ])
            ->orderByDesc('je.entry_date');

        // Apply level filter
        if ($filterLevel === 'unrelated') {
            $query->where('je.is_related', false);
        } elseif ($filterLevel === 'warning') {
            $query->where('je.flag_level', 'Warning - Errand / Administrative');
        } elseif ($filterLevel === 'normal') {
            $query->where('je.flag_level', 'Normal');
        }

        $entries = $query->paginate($perPage);

        // Decode JSON detected_tasks for each entry
        $entries->getCollection()->transform(function ($entry) {
            $entry->detected_tasks = json_decode($entry->detected_tasks ?? '[]', true);
            return $entry;
        });

        return response()->json([
            'company' => [
                'id' => $company->id,
                'company_name' => $company->company_name,
                'industry' => $company->industry,
                'verification_status' => $company->verification_status,
                'eligibility_status' => $company->eligibility_status ?? 'pending',
            ],
            'stats' => $stats,
            'entries' => $entries,
            'filter_level' => $filterLevel,
        ]);
    }

    /**
     * Get journal classification summary for a company (used in company detail page).
     * 
     * GET /api/v1/coordinator/companies/{company_id}/journal-stats
     */
    public function companyJournalStats(Request $request, int $companyId): JsonResponse
    {
        $stats = JournalClassificationService::getCompanyStatistics($companyId, $this->assignedProgram($request));

        return response()->json($stats);
    }

    private function assignedProgram(Request $request): ?string
    {
        $user = $request->user();
        $program = $user?->isCoordinator() ? $user->coordinatorProfile?->program : null;

        return $program && isset(AcademicPrograms::PROGRAMS[$program]) ? $program : null;
    }
}
