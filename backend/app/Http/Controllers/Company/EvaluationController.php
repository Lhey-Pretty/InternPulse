<?php

namespace App\Http\Controllers\Company;

use App\Http\Controllers\Controller;
use App\Models\Evaluation;
use App\Models\InternshipPlacement;
use App\Models\Notification;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

class EvaluationController extends Controller
{
    public function create(Request $request, InternshipPlacement $placement): View
    {
        $this->authorizePlacement($request, $placement);

        // The OJT uses one completion evaluation after the required hours.
        // Keep the legacy "final" value internally for database compatibility.
        $period = 'final';
        $existing = $placement->evaluations()->where('evaluation_period', $period)->first();

        $placement->load(['studentProfile', 'internshipPosting']);

        return view('company.evaluations.create', compact('placement', 'period', 'existing'));
    }

    public function store(Request $request, InternshipPlacement $placement): RedirectResponse
    {
        $this->authorizePlacement($request, $placement);

        // ── Validation — official 12 criteria (1–5 scale each) ────────────────
        $criteriaRules = collect(Evaluation::criteriaFields())
            ->mapWithKeys(fn ($field) => [$field => ['required', 'numeric', 'min:1', 'max:5']])
            ->toArray();

        $validated = $request->validate(array_merge($criteriaRules, [
            'strengths'                => ['nullable', 'string', 'max:1000'],
            'areas_for_improvement'    => ['nullable', 'string', 'max:1000'],
            'general_comments'         => ['nullable', 'string', 'max:2000'],
            'recommendation'           => ['nullable', 'in:highly_recommended,recommended,needs_improvement,not_recommended'],
            'rated_by_name'            => ['nullable', 'string', 'max:200'],
            'inclusive_training_period'=> ['nullable', 'string', 'max:200'],
            'agency_address'           => ['nullable', 'string', 'max:500'],
        ]));

        // ── Compute scores using official MinSU conversion table ──────────────
        $totalPoints    = (int) round(
            collect(Evaluation::criteriaFields())->sum(fn ($f) => (float) $validated[$f])
        );
        $overallRating  = round(
            collect(Evaluation::criteriaFields())->average(fn ($f) => (float) $validated[$f]), 2
        );
        $equivalentRating = Evaluation::convertToEquivalentRating($totalPoints);

        Evaluation::updateOrCreate(
            [
                'internship_placement_id' => $placement->id,
                'evaluation_period'       => 'final',
            ],
            array_merge($validated, [
                'evaluation_period'   => 'final',
                'student_profile_id' => $placement->student_profile_id,
                'evaluated_by'       => $request->user()->id,
                'overall_rating'     => $overallRating,
                'total_points'       => $totalPoints,
                'equivalent_rating'  => $equivalentRating,
                'submitted_at'       => now(),
            ])
        );

        Notification::send(
            $placement->studentProfile->user_id,
            'evaluation_submitted',
            'Evaluation Submitted',
            "Your OJT completion evaluation has been submitted. Equivalent rating: {$equivalentRating}."
        );

        return redirect()->route('company.interns.show', $placement)
            ->with('success', "Evaluation submitted. Total points: {$totalPoints}/60 — Equivalent rating: {$equivalentRating}.");
    }

    public function index(Request $request): View
    {
        $company = $request->user()->companyProfile;
        $postingIds = $company ? $company->internshipPostings()->pluck('id') : collect();

        $evaluations = Evaluation::whereHas(
            'internshipPlacement',
            fn ($q) => $q->whereIn('internship_posting_id', $postingIds)
        )
            ->with(['studentProfile', 'internshipPlacement.internshipPosting'])
            ->latest('submitted_at')
            ->paginate(10);

        return view('company.evaluations.index', compact('evaluations'));
    }

    private function authorizePlacement(Request $request, InternshipPlacement $placement): void
    {
        $company = $request->user()->companyProfile;
        $postingIds = $company ? $company->internshipPostings()->pluck('id') : collect();

        abort_if(! $postingIds->contains($placement->internship_posting_id), 403);
    }
}
