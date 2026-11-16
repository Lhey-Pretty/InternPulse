<?php

namespace App\Http\Controllers\Coordinator;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\InternshipPlacement;
use App\Models\InternshipPosting;
use App\Models\Notification;
use App\Models\PlacementRecommendation;
use App\Models\StudentProfile;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

class PlacementConfirmController extends Controller
{
    /**
     * Show pending/unconfirmed recommendations for coordinator to act on.
     */
    public function index(Request $request): View
    {
        $recommendations = PlacementRecommendation::with([
            'studentProfile',
            'internshipPosting.companyProfile',
            'recommendedByUser',
        ])
            ->when($request->input('status'), fn ($q, $s) => $q->where('status', $s))
            ->latest()
            ->paginate(10)
            ->withQueryString();

        return view('coordinator.placements.confirm', compact('recommendations'));
    }

    /**
     * Show form to create a new recommendation (coordinator manually assigns).
     */
    public function create(): View
    {
        // Only get students that:
        // 1. Have active user accounts
        // 2. Don't have an active placement already
        $students = StudentProfile::with('user')
            ->whereHas('user', fn ($q) => $q->where('is_active', true))
            ->whereDoesntHave('placements', fn ($q) => $q->where('status', 'active'))
            ->get();

        $postings = InternshipPosting::with('companyProfile')
            ->where('status', 'approved')
            ->get();

        return view('coordinator.placements.recommend', compact('students', 'postings'));
    }

    /**
     * Coordinator creates a placement recommendation.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'student_profile_id' => ['required', 'exists:student_profiles,id'],
            'internship_posting_id' => ['required', 'exists:internship_postings,id'],
            'reason' => ['nullable', 'string', 'max:1000'],
        ]);

        PlacementRecommendation::create(array_merge($validated, [
            'recommended_by' => $request->user()->id,
            'source' => 'coordinator',
            'status' => 'pending',
        ]));

        Notification::send(
            StudentProfile::find($validated['student_profile_id'])->user_id,
            'placement_recommendation',
            'Placement Recommendation',
            'Your coordinator has created an internship placement recommendation for you. Please check your placement details.'
        );

        AuditLog::record('placement.recommended', null, $validated);

        return redirect()->route('coordinator.placements.confirm')
            ->with('success', 'Placement recommendation created.');
    }

    /**
     * Coordinator confirms a recommendation → creates actual placement.
     */
    public function confirm(Request $request, PlacementRecommendation $recommendation): RedirectResponse
    {
        abort_if($recommendation->status !== 'pending', 403, 'Already processed.');

        $validated = $request->validate([
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after:start_date'],
            'required_hours' => ['required', 'integer', 'min:1'],
            'coordinator_notes' => ['nullable', 'string', 'max:1000'],
        ]);

        if ($recommendation->application_id && $recommendation->application?->status !== 'accepted') {
            return back()->with('error', 'The related application must be accepted before confirming placement.');
        }

        if ($recommendation->studentProfile->placements()->where('status', 'active')->exists()) {
            return back()->with('error', 'This student already has an active placement.');
        }

        // Create the placement
        $placement = InternshipPlacement::create([
            'student_profile_id' => $recommendation->student_profile_id,
            'internship_posting_id' => $recommendation->internship_posting_id,
            'application_id' => $recommendation->application_id,
            'approved_by' => $request->user()->id,
            'start_date' => $validated['start_date'],
            'end_date' => $validated['end_date'],
            'required_hours' => $validated['required_hours'],
            'rendered_hours' => 0,
            'status' => 'active',
            'approved_at' => now(),
        ]);

        $recommendation->update([
            'status' => 'confirmed',
            'coordinator_notes' => $validated['coordinator_notes'] ?? null,
            'confirmed_at' => now(),
        ]);

        Notification::send(
            $recommendation->studentProfile->user_id,
            'placement_confirmed',
            'Internship Placement Confirmed',
            "Your internship placement at {$recommendation->internshipPosting->companyProfile->company_name} has been confirmed. Start date: {$validated['start_date']}."
        );

        AuditLog::record('placement.confirmed', $placement);

        return redirect()->route('coordinator.placements.confirm')
            ->with('success', 'Placement confirmed and student notified.');
    }

    /**
     * Coordinator rejects a recommendation.
     */
    public function reject(Request $request, PlacementRecommendation $recommendation): RedirectResponse
    {
        $validated = $request->validate([
            'coordinator_notes' => ['required', 'string', 'max:1000'],
        ]);

        $recommendation->update([
            'status' => 'rejected',
            'coordinator_notes' => $validated['coordinator_notes'],
        ]);

        return back()->with('success', 'Recommendation rejected.');
    }
}
