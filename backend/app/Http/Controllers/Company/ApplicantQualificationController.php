<?php

namespace App\Http\Controllers\Company;

use App\Http\Controllers\Controller;
use App\Models\Application;
use Illuminate\Http\Request;
use Illuminate\View\View;

class ApplicantQualificationController extends Controller
{
    public function show(Request $request, Application $application): View
    {
        $company = $request->user()->companyProfile;
        $postingIds = $company ? $company->internshipPostings()->pluck('id') : collect();

        abort_if(! $postingIds->contains($application->internship_posting_id), 403);

        $application->load([
            'studentProfile.skills',
            'studentProfile.user',
            'internshipPosting',
        ]);

        // Compute simple qualification check: required skills vs student skills
        $requiredSkills = array_map('strtolower', $application->internshipPosting->required_skills ?? []);
        $studentSkills = $application->studentProfile->skills
            ->pluck('name')
            ->map(fn ($n) => strtolower($n))
            ->toArray();

        $matchedSkills = array_values(array_intersect($requiredSkills, $studentSkills));
        $missingSkills = array_values(array_diff($requiredSkills, $studentSkills));

        $courseRequired = $application->internshipPosting->required_course;
        $courseMatch = ! $courseRequired
            || stripos($application->studentProfile->course, $courseRequired) !== false;

        return view('company.applicants.qualifications', compact(
            'application',
            'matchedSkills',
            'missingSkills',
            'courseMatch',
        ));
    }
}
