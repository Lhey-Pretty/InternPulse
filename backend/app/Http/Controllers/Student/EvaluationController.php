<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\View\View;

class EvaluationController extends Controller
{
    public function index(Request $request): View
    {
        $student = $request->user()->studentProfile;

        $evaluations = $student
            ? $student->evaluations()
                ->with(['internshipPlacement.internshipPosting.companyProfile'])
                ->orderByDesc('submitted_at')
                ->get()
            : collect();

        return view('student.evaluations.index', compact('evaluations'));
    }
}
