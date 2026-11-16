<?php

namespace App\Http\Controllers\Coordinator;

use App\Http\Controllers\Controller;
use App\Models\Application;
use Illuminate\Http\Request;
use Illuminate\View\View;

class ApplicationReviewController extends Controller
{
    public function index(Request $request): View
    {
        $query = Application::with([
            'studentProfile',
            'internshipPosting.companyProfile',
        ]);

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        if ($search = $request->input('search')) {
            $query->whereHas('studentProfile', fn ($q) => $q
                ->where('first_name', 'like', "%{$search}%")
                ->orWhere('last_name', 'like', "%{$search}%"));
        }

        $applications = $query->latest('applied_at')->paginate(10)->withQueryString();

        $statusCounts = [
            'pending' => Application::where('status', 'pending')->count(),
            'shortlisted' => Application::where('status', 'shortlisted')->count(),
            'accepted' => Application::where('status', 'accepted')->count(),
            'rejected' => Application::where('status', 'rejected')->count(),
        ];

        return view('coordinator.applications.index', compact('applications', 'statusCounts'));
    }

    public function show(Application $application): View
    {
        $application->load([
            'studentProfile.skills',
            'internshipPosting.companyProfile',
        ]);

        return view('coordinator.applications.show', compact('application'));
    }
}
