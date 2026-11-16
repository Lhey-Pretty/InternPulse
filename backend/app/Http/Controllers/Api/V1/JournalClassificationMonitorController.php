<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\CompanyProfile;
use App\Models\CompanyRating;
use App\Services\JournalClassificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class JournalClassificationMonitorController extends Controller
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

        // Get all companies with active placements
        $companies = CompanyProfile::whereHas('internshipPostings.placements', function ($query) {
            $query->whereIn('status', ['active', 'completed']);
        })
            ->with(['internshipPostings' => function ($query) {
                $query->whereHas('placements', function ($q) {
                    $q->whereIn('status', ['active', 'completed']);
                });
            }])
            ->get();

        // Calculate journal statistics for each company
        $companyStats = $companies->map(function ($company) {
            $stats = JournalClassificationService::getCompanyStatistics($company->id);
            
            return [
                'company_id' => $company->id,
                'company_name' => $company->company_name,
                'industry' => $company->industry,
                'verification_status' => $company->verification_status,
                'eligibility_status' => $company->eligibility_status ?? 'pending',
                'stats' => $stats,
            ];
        });

        // Overall task relevance across classified student journal entries.
        $journalTasks = [
            'related' => (int) \DB::table('journal_entries')->where('is_related', true)->count(),
            'unrelated' => (int) \DB::table('journal_entries')->where('is_related', false)->count(),
        ];
        $journalTasks['total'] = $journalTasks['related'] + $journalTasks['unrelated'];

        // Include every company with at least one student-submitted evaluation,
        // even if it has no active placement anymore.
        $evaluatedCompanies = CompanyRating::query()
            ->join('company_profiles', 'company_ratings.company_profile_id', '=', 'company_profiles.id')
            ->where('company_ratings.rater_role', 'student')
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
        $stats = JournalClassificationService::getCompanyStatistics($companyId);

        $filterLevel = $request->input('level', 'all');
        $perPage = min(10, max(1, (int) $request->input('per_page', 10)));

        // Get all journal entries from interns at this company
        $query = \DB::table('journal_entries as je')
            ->join('internship_placements as ip', 'je.internship_placement_id', '=', 'ip.id')
            ->join('internship_postings as posting', 'ip.internship_posting_id', '=', 'posting.id')
            ->join('student_profiles as sp', 'je.student_profile_id', '=', 'sp.id')
            ->join('users', 'sp.user_id', '=', 'users.id')
            ->where('posting.company_profile_id', $companyId)
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
    public function companyJournalStats(int $companyId): JsonResponse
    {
        $stats = JournalClassificationService::getCompanyStatistics($companyId);

        return response()->json($stats);
    }
}
