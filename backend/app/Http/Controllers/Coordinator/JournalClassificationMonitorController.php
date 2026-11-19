<?php

namespace App\Http\Controllers\Coordinator;

use App\Http\Controllers\Controller;
use App\Models\CompanyProfile;
use App\Services\JournalClassificationService;
use Illuminate\Http\Request;
use Illuminate\View\View;

class JournalClassificationMonitorController extends Controller
{
    /**
     * Show dashboard of companies with flagged journal entries.
     * Helps coordinators identify companies that may not be providing proper internship experiences.
     */
    public function index(Request $request): View
    {
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
                'company' => $company,
                'stats' => $stats,
            ];
        });

        // Sort by unrelated percentage (highest first)
        $companyStats = $companyStats->sortByDesc('stats.unrelated_percentage')->values();

        // Filter options
        $filterStatus = $request->input('filter', 'all'); // all, flagged, needs_review
        
        if ($filterStatus === 'flagged') {
            $companyStats = $companyStats->filter(fn($item) => $item['stats']['flagged_entries'] > 0);
        } elseif ($filterStatus === 'needs_review') {
            $companyStats = $companyStats->filter(fn($item) => $item['stats']['needs_review']);
        }

        return view('coordinator.journal-classification.index', compact('companyStats', 'filterStatus'));
    }

    /**
     * Show detailed journal entries for a specific company.
     */
    public function show(Request $request, CompanyProfile $company): View
    {
        $stats = JournalClassificationService::getCompanyStatistics($company->id);

        // Get all journal entries from interns at this company
        $entries = \DB::table('journal_entries as je')
            ->join('internship_placements as ip', 'je.internship_placement_id', '=', 'ip.id')
            ->join('internship_postings as posting', 'ip.internship_posting_id', '=', 'posting.id')
            ->join('student_profiles as sp', 'je.student_profile_id', '=', 'sp.id')
            ->join('users', 'sp.user_id', '=', 'users.id')
            ->where('posting.company_profile_id', $company->id)
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
            ->orderByDesc('je.entry_date')
            ->paginate(10)
            ->withQueryString();

        // Decode JSON detected_tasks for each entry
        foreach ($entries as $entry) {
            $entry->detected_tasks = json_decode($entry->detected_tasks ?? '[]', true);
        }

        $filterLevel = $request->input('level', 'all'); // all, unrelated, warning, normal

        return view('coordinator.journal-classification.show', compact('company', 'stats', 'entries', 'filterLevel'));
    }
}
