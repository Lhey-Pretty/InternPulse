<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Models\CompanyRating;
use App\Models\InternshipPlacement;
use App\Models\SystemSetting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

class CompanyEvaluationController extends Controller
{
    public function index(Request $request): View
    {
        $student = $request->user()->studentProfile;

        $placements = $student
            ? $student->placements()
                ->with(['internshipPosting.companyProfile', 'companyRating'])
                ->whereIn('status', ['active', 'completed'])
                ->latest()
                ->get()
            : collect();

        return view('student.company-evaluation.index', compact('placements'));
    }

    public function create(Request $request, InternshipPlacement $placement): View
    {
        $this->authorizePlacement($request, $placement);

        $placement->load(['internshipPosting.companyProfile', 'companyRating']);

        $existing = $placement->companyRating()->where('rated_by', $request->user()->id)->first();

        return view('student.company-evaluation.create', compact('placement', 'existing'));
    }

    public function store(Request $request, InternshipPlacement $placement): RedirectResponse
    {
        $this->authorizePlacement($request, $placement);
        abort_unless((bool) SystemSetting::get('evaluation_editing_enabled', '0'), 403, 'Evaluation editing is currently disabled by the administrator.');

        $validated = $request->validate([
            'work_environment' => ['required', 'numeric', 'min:1', 'max:5'],
            'mentorship_quality' => ['required', 'numeric', 'min:1', 'max:5'],
            'learning_opportunities' => ['required', 'numeric', 'min:1', 'max:5'],
            'facilities' => ['required', 'numeric', 'min:1', 'max:5'],
            'overall_experience' => ['required', 'numeric', 'min:1', 'max:5'],
            'feedback' => ['nullable', 'string', 'max:2000'],
            'would_recommend' => ['boolean'],
        ]);

        $criteria = ['work_environment', 'mentorship_quality', 'learning_opportunities', 'facilities', 'overall_experience'];
        $avg = round(collect($criteria)->map(fn ($c) => (float) $validated[$c])->average(), 2);

        CompanyRating::updateOrCreate(
            [
                'internship_placement_id' => $placement->id,
                'rated_by' => $request->user()->id,
            ],
            array_merge($validated, [
                'company_profile_id' => $placement->internshipPosting->companyProfile->id,
                'rater_role' => 'student',
                'average_rating' => $avg,
                'would_recommend' => $request->boolean('would_recommend'),
            ])
        );

        return redirect()->route('student.company-evaluation.index')
            ->with('success', 'Company evaluation submitted. Thank you for your feedback!');
    }

    private function authorizePlacement(Request $request, InternshipPlacement $placement): void
    {
        $student = $request->user()->studentProfile;
        abort_if(! $student || $placement->student_profile_id !== $student->id, 403);
    }
}
