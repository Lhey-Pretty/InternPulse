<?php

namespace App\Http\Controllers\Company;

use App\Http\Controllers\Controller;
use App\Models\Application;
use App\Models\InternshipPlacement;
use App\Models\Notification;
use App\Models\PlacementRecommendation;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

class ApplicantController extends Controller
{
    public function index(Request $request): View
    {
        $company = $request->user()->companyProfile;

        $postingIds = $company ? $company->internshipPostings()->pluck('id') : collect();

        $applications = Application::whereIn('internship_posting_id', $postingIds)
            ->with(['studentProfile.skills', 'internshipPosting'])
            ->when($request->input('status'), fn ($q, $status) => $q->where('status', $status))
            ->when($request->input('posting_id'), fn ($q, $id) => $q->where('internship_posting_id', $id))
            ->orderByDesc('applied_at')
            ->paginate(10)
            ->withQueryString();

        $postings = $company ? $company->internshipPostings()->get(['id', 'title']) : collect();

        return view('company.applicants.index', compact('applications', 'postings'));
    }

    public function show(Request $request, Application $application): View
    {
        $this->authorizeApplication($request, $application);

        $application->load(['studentProfile.skills', 'internshipPosting']);

        return view('company.applicants.show', compact('application'));
    }

    public function updateStatus(Request $request, Application $application): RedirectResponse
    {
        $this->authorizeApplication($request, $application);

        $validated = $request->validate([
            'status' => ['required', 'in:shortlisted,interview,accepted,rejected'],
            'rejection_reason' => ['nullable', 'required_if:status,rejected', 'string', 'max:1000'],
            'interview_date' => ['nullable', 'required_if:status,interview', 'date'],
            'interview_time' => ['nullable', 'string'],
            'interview_location' => ['nullable', 'string', 'max:200'],
        ]);

        $application->update(array_merge($validated, ['reviewed_at' => now()]));

        // Notify student
        $statusMessages = [
            'shortlisted' => "Your application for {$application->internshipPosting->title} has been shortlisted!",
            'interview' => "You have been invited for an interview for {$application->internshipPosting->title}.",
            'accepted' => "Congratulations! Your application for {$application->internshipPosting->title} has been accepted.",
            'rejected' => "Your application for {$application->internshipPosting->title} has not been accepted at this time.",
        ];

        Notification::send(
            $application->studentProfile->user_id,
            'application_status',
            'Application Update',
            $statusMessages[$validated['status']]
        );

        return back()->with('success', 'Application status updated.');
    }

    public function createPlacement(Request $request, Application $application): RedirectResponse
    {
        $this->authorizeApplication($request, $application);

        if ($application->status !== 'accepted') {
            return back()->with('error', 'Application must be accepted before creating a placement.');
        }

        if ($application->placement) {
            return back()->with('error', 'A placement already exists for this application.');
        }

        if ($application->placementRecommendations()->where('status', 'pending')->exists()) {
            return back()->with('error', 'This placement is already awaiting coordinator approval.');
        }

        $validated = $request->validate([
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after:start_date'],
            'required_hours' => ['required', 'integer', 'min:1'],
        ]);

        PlacementRecommendation::create([
            'student_profile_id' => $application->student_profile_id,
            'internship_posting_id' => $application->internship_posting_id,
            'application_id' => $application->id,
            'recommended_by' => $request->user()->id,
            'source' => 'company',
            'reason' => 'Placement date proposed by the company after accepting the application.',
            'requested_start_date' => $validated['start_date'],
            'requested_end_date' => $validated['end_date'],
            'requested_required_hours' => $validated['required_hours'],
            'status' => 'pending',
        ]);

        Notification::send(
            $application->studentProfile->user_id,
            'placement_recommendation',
            'Placement Awaiting Coordinator Approval',
            "The company proposed your OJT schedule. Your coordinator must approve it before your internship starts."
        );

        return redirect()->route('company.applicants.show', $application)
            ->with('success', 'Placement request submitted for coordinator approval.');
    }

    private function authorizeApplication(Request $request, Application $application): void
    {
        $company = $request->user()->companyProfile;
        $postingIds = $company ? $company->internshipPostings()->pluck('id') : collect();

        abort_if(! $postingIds->contains($application->internship_posting_id), 403);
    }
}
