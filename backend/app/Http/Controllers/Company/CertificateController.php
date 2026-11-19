<?php

namespace App\Http\Controllers\Company;

use App\Http\Controllers\Controller;
use App\Models\InternshipPlacement;
use Illuminate\Http\Request;
use Illuminate\View\View;

class CertificateController extends Controller
{
    /**
     * Generate printable OJT completion certificate
     * Can be previewed even before official completion
     */
    public function show(Request $request, InternshipPlacement $placement): View
    {
        // Authorize company access
        $company = $request->user()->companyProfile;
        $postingIds = $company ? $company->internshipPostings()->pluck('id') : collect();
        abort_if(!$postingIds->contains($placement->internship_posting_id), 403);

        // Allow preview even if not completed yet (for review purposes)
        // abort_if($placement->status !== 'completed', 403, 'Certificate only available for completed internships.');

        $placement->load([
            'studentProfile.user',
            'internshipPosting.companyProfile',
            'evaluations' => fn($q) => $q->where('evaluation_period', 'final')
        ]);

        // Get final evaluation rating
        $finalEvaluation = $placement->evaluations->first();
        $overallRating = $finalEvaluation?->overall_rating ?? 0;

        // Determine performance level
        $performanceLevel = match(true) {
            $overallRating >= 4.5 => 'Outstanding',
            $overallRating >= 4.0 => 'Excellent',
            $overallRating >= 3.5 => 'Very Satisfactory',
            $overallRating >= 3.0 => 'Satisfactory',
            default => 'Fair'
        };

        $isPreview = $placement->status !== 'completed';

        return view('company.certificate.show', compact('placement', 'performanceLevel', 'overallRating', 'isPreview'));
    }

    /**
     * Generate printable evaluation form with ratings
     */
    public function evaluation(Request $request, InternshipPlacement $placement): View
    {
        // Authorize company access
        $company = $request->user()->companyProfile;
        $postingIds = $company ? $company->internshipPostings()->pluck('id') : collect();
        abort_if(!$postingIds->contains($placement->internship_posting_id), 403);

        $placement->load([
            'studentProfile',
            'internshipPosting.companyProfile',
            'evaluations' => fn($q) => $q->where('evaluation_period', 'final')
        ]);

        $evaluation = $placement->evaluations->first();
        abort_if(!$evaluation, 404, 'No evaluation found for this placement.');

        $student = $placement->studentProfile;
        $company = $placement->internshipPosting->companyProfile;

        return view('company.evaluation.show', compact('placement', 'evaluation', 'student', 'company'));
    }
}
