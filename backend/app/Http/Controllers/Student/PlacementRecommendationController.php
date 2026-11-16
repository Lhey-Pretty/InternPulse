<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\View\View;

class PlacementRecommendationController extends Controller
{
    public function index(Request $request): View
    {
        $student = $request->user()->studentProfile;

        $recommendations = $student
            ? $student->placementRecommendations()
                ->with(['internshipPosting.companyProfile', 'recommendedByUser'])
                ->latest()
                ->get()
            : collect();

        $activePlacement = $student
            ? $student->placements()->with(['internshipPosting.companyProfile'])->where('status', 'active')->first()
            : null;

        return view('student.placement-recommendation.index', compact(
            'recommendations',
            'activePlacement',
            'student',
        ));
    }
}
