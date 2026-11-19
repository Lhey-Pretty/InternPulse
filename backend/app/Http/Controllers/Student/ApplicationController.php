<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Models\Application;
use App\Models\InternshipPosting;
use App\Models\Notification;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

class ApplicationController extends Controller
{
    public function index(Request $request): View
    {
        $student = $request->user()->studentProfile;

        $applications = $student
            ? $student->applications()
                ->with(['internshipPosting.companyProfile'])
                ->latest()
                ->paginate(10)
            : collect();

        return view('student.applications.index', compact('applications'));
    }

    public function store(Request $request, InternshipPosting $internshipPosting): RedirectResponse
    {
        $student = $request->user()->studentProfile;

        if (! $student) {
            return redirect()->route('student.profile.edit')
                ->with('error', 'Please complete your profile before applying.');
        }

        if (! $internshipPosting->isOpen()) {
            return back()->with('error', 'This internship is no longer accepting applications.');
        }

        $alreadyApplied = $student->applications()
            ->where('internship_posting_id', $internshipPosting->id)
            ->exists();

        if ($alreadyApplied) {
            return back()->with('error', 'You have already applied for this internship.');
        }

        $validated = $request->validate([
            'cover_letter' => ['nullable', 'string', 'max:3000'],
        ]);

        Application::create([
            'student_profile_id' => $student->id,
            'internship_posting_id' => $internshipPosting->id,
            'status' => 'pending',
            'cover_letter' => $validated['cover_letter'] ?? null,
            'resume_path' => $student->resume_path,
            'applied_at' => now(),
        ]);

        Notification::send(
            $request->user()->id,
            'application_submitted',
            'Application Submitted',
            "Your application for {$internshipPosting->title} at {$internshipPosting->companyProfile->company_name} has been submitted."
        );

        return redirect()->route('student.applications.index')
            ->with('success', 'Application submitted successfully!');
    }

    public function show(Request $request, Application $application): View
    {
        $this->authorizeApplication($request, $application);

        $application->load(['internshipPosting.companyProfile']);

        return view('student.applications.show', compact('application'));
    }

    public function withdraw(Request $request, Application $application): RedirectResponse
    {
        $this->authorizeApplication($request, $application);

        if (! in_array($application->status, ['pending', 'shortlisted'])) {
            return back()->with('error', 'This application can no longer be withdrawn.');
        }

        $application->update(['status' => 'withdrawn']);

        return redirect()->route('student.applications.index')
            ->with('success', 'Application withdrawn.');
    }

    private function authorizeApplication(Request $request, Application $application): void
    {
        $student = $request->user()->studentProfile;

        abort_if(! $student || $application->student_profile_id !== $student->id, 403);
    }
}
