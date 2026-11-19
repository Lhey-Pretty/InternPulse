<?php

namespace App\Http\Controllers\Coordinator;

use App\Http\Controllers\Controller;
use App\Models\CompanyProfile;
use App\Models\InternshipPlacement;
use App\Models\InternshipPosting;
use App\Models\StudentProfile;
use Illuminate\Http\Request;
use Illuminate\View\View;

class DashboardController extends Controller
{
    public function index(Request $request): View
    {
        $stats = [
            'total_students' => StudentProfile::count(),
            'students_on_internship' => InternshipPlacement::where('status', 'active')->distinct('student_profile_id')->count('student_profile_id'),
            'students_completed' => InternshipPlacement::where('status', 'completed')->distinct('student_profile_id')->count('student_profile_id'),
            'students_without_placement' => StudentProfile::whereDoesntHave('placements')->count(),
            'total_companies' => CompanyProfile::count(),
            'verified_companies' => CompanyProfile::where('verification_status', 'verified')->count(),
            'pending_companies' => CompanyProfile::where('verification_status', 'pending')->count(),
            'total_postings' => InternshipPosting::count(),
            'pending_postings' => InternshipPosting::where('status', 'pending')->count(),
            'approved_postings' => InternshipPosting::where('status', 'approved')->count(),
        ];

        $recentPlacements = InternshipPlacement::with(['studentProfile', 'internshipPosting.companyProfile'])
            ->latest()
            ->take(5)
            ->get();

        $pendingPostings = InternshipPosting::with('companyProfile')
            ->where('status', 'pending')
            ->latest()
            ->take(5)
            ->get();

        return view('coordinator.dashboard', compact('stats', 'recentPlacements', 'pendingPostings'));
    }
}
