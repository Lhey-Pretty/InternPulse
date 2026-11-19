<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\Application;
use App\Models\InternshipPlacement;
use App\Http\Filters\V1\ApplicationFilter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ApplicationController extends ApiController
{
    /**
     * Display a listing of applications.
     */
    public function index(Request $request, ApplicationFilter $filters): JsonResponse
    {
        $user = $request->user();

        $query = Application::with(['studentProfile', 'internshipPosting.companyProfile']);

        if ($user && $user->isStudent() && $user->studentProfile) {
            $query->where('student_profile_id', $user->studentProfile->id);
        } elseif ($user && $user->isCompany() && $user->companyProfile) {
            $query->whereHas('internshipPosting', function ($q) use ($user): void {
                $q->where('company_profile_id', $user->companyProfile->id);
            });
        } elseif (! $user || ! $user->isCoordinator() && ! $user->isAdmin()) {
            abort(403, 'You are not authorized to view applications.');
        }

        $query->filter($filters);
        if (! $request->query('sort')) {
            $query->latest('applied_at');
        }
        $applications = $query->orderBy('applications.id')->paginate($this->perPage($request));

        return $this->ok('Applications retrieved successfully.', $applications);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        $student = $user?->studentProfile;

        if (! $user?->isStudent() || ! $student) {
            return $this->error('Complete your student profile before applying.', 403);
        }

        $validated = $request->validate([
            'internship_posting_id' => ['required', 'integer', 'exists:internship_postings,id'],
            'cover_letter' => ['nullable', 'string', 'max:3000'],
        ]);

        // A retry should return the original result even if its status changed
        // or the posting closed after the first successful submission.
        $existing = Application::where('student_profile_id', $student->id)
            ->where('internship_posting_id', $validated['internship_posting_id'])
            ->first();
        if ($existing) {
            return $this->success(
                'You have already applied for this internship.',
                $existing->load('internshipPosting.companyProfile'),
                200,
            );
        }

        $hasAcceptedApplication = Application::where('student_profile_id', $student->id)
            ->where('status', 'accepted')
            ->exists();
        $hasActivePlacement = InternshipPlacement::where('student_profile_id', $student->id)
            ->whereIn('status', ['active', 'on_hold'])
            ->exists();

        if ($hasAcceptedApplication || $hasActivePlacement) {
            return $this->error('You already have an accepted internship or active placement. New internship applications are unavailable while it is in progress.', 422);
        }

        $posting = \App\Models\InternshipPosting::findOrFail($validated['internship_posting_id']);
        if (! $posting->isOpen()) {
            return $this->error('This internship is no longer accepting applications.', 422);
        }

        // The database has a unique student/posting constraint. firstOrCreate
        // makes a repeated submission return the existing application safely.
        $application = Application::firstOrCreate([
            'student_profile_id' => $student->id,
            'internship_posting_id' => $posting->id,
        ], [
            'cover_letter' => $validated['cover_letter'] ?? null,
            'resume_path' => $student->resume_path,
            'applied_at' => now(),
        ]);

        return $this->success(
            $application->wasRecentlyCreated ? 'Application submitted successfully.' : 'You have already applied for this internship.',
            $application->load('internshipPosting.companyProfile'),
            $application->wasRecentlyCreated ? 201 : 200,
        );
    }

    /**
     * Display the specified application.
     */
    public function show(int $id): JsonResponse
    {
        $application = Application::with(['studentProfile', 'internshipPosting.companyProfile', 'placement'])
            ->find($id);

        if (! $application) {
            return $this->error('Application not found.', 404);
        }

        $this->authorize('view', $application);

        return $this->ok('Application retrieved successfully.', $application);
    }

    /**
     * Withdraw a pending or shortlisted application.
     */
    public function withdraw(Request $request, int $id): JsonResponse
    {
        $application = Application::find($id);

        if (! $application) {
            return $this->error('Application not found.', 404);
        }

        $student = $request->user()?->studentProfile;

        if (! $student || $application->student_profile_id !== $student->id) {
            return $this->error('You are not authorized to withdraw this application.', 403);
        }

        if (! in_array($application->status, ['pending', 'shortlisted'])) {
            return $this->error('This application can no longer be withdrawn.', 422);
        }

        $application->update(['status' => 'withdrawn']);

        return $this->ok('Application withdrawn successfully.', $application->fresh());
    }
}
