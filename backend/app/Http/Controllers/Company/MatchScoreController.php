<?php

namespace App\Http\Controllers\Company;

use App\Http\Controllers\Controller;
use App\Models\Application;
use Illuminate\Http\Request;
use Illuminate\View\View;

class MatchScoreController extends Controller
{
    /**
     * Show match scores for all applicants across the company's postings.
     * Scores are computed from skills + course alignment (ML placeholder).
     */
    public function index(Request $request): View
    {
        $company = $request->user()->companyProfile;
        $postingIds = $company ? $company->internshipPostings()->pluck('id') : collect();

        $applications = Application::whereIn('internship_posting_id', $postingIds)
            ->with(['studentProfile.skills', 'internshipPosting'])
            ->whereNotIn('status', ['withdrawn'])
            ->get()
            ->map(function ($app) {
                $requiredSkills = array_map('strtolower', $app->internshipPosting->required_skills ?? []);
                $studentSkills = $app->studentProfile->skills
                    ->pluck('name')
                    ->map(fn ($n) => strtolower($n))
                    ->toArray();

                $matched = array_intersect($requiredSkills, $studentSkills);
                $total = count($requiredSkills) ?: 1;

                $courseMatch = ! $app->internshipPosting->required_course
                    || stripos($app->studentProfile->course, $app->internshipPosting->required_course) !== false;

                $matchedCount = count($matched);
                $score = $matchedCount === 0
                    ? 0
                    : round(($matchedCount / $total) * 70 + ($courseMatch ? 30 : 0), 0);

                $app->computed_score = $score;
                $app->matched_count = $matchedCount;
                $app->total_required = count($requiredSkills);
                $app->course_match = $courseMatch;

                return $app;
            })
            ->sortByDesc('computed_score');

        $postings = $company ? $company->internshipPostings()->get(['id', 'title']) : collect();

        return view('company.match-scores.index', compact('applications', 'postings'));
    }
}
