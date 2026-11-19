<?php

namespace App\Http\Controllers\Company;

use App\Http\Controllers\Controller;
use App\Models\Application;
use App\Models\InternshipPlacement;
use Illuminate\Http\Request;
use Illuminate\View\View;

class DashboardController extends Controller
{
    public function index(Request $request): View
    {
        $company = $request->user()->companyProfile;

        $stats = [
            'total_postings' => 0,
            'active_postings' => 0,
            'total_applications' => 0,
            'pending_applications' => 0,
            'active_interns' => 0,
        ];

        $recentApplications = collect();
        $activeInterns = collect();

        if ($company) {
            $postingIds = $company->internshipPostings()->pluck('id');

            $stats['total_postings'] = $company->internshipPostings()->count();
            $stats['active_postings'] = $company->activePostings()->count();
            $stats['total_applications'] = Application::whereIn('internship_posting_id', $postingIds)->count();
            $stats['pending_applications'] = Application::whereIn('internship_posting_id', $postingIds)->where('status', 'pending')->count();
            $stats['active_interns'] = InternshipPlacement::whereIn('internship_posting_id', $postingIds)->where('status', 'active')->count();

            $recentApplications = Application::whereIn('internship_posting_id', $postingIds)
                ->with(['studentProfile', 'internshipPosting'])
                ->latest()
                ->take(5)
                ->get();

            $activeInterns = InternshipPlacement::whereIn('internship_posting_id', $postingIds)
                ->with(['studentProfile', 'internshipPosting'])
                ->where('status', 'active')
                ->take(5)
                ->get();
        }

        return view('company.dashboard', compact('company', 'stats', 'recentApplications', 'activeInterns'));
    }
}
