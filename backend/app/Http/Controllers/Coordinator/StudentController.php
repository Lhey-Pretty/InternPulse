<?php

namespace App\Http\Controllers\Coordinator;

use App\Http\Controllers\Controller;
use App\Models\StudentProfile;
use Illuminate\Http\Request;
use Illuminate\View\View;

class StudentController extends Controller
{
    public function index(Request $request): View
    {
        $query = StudentProfile::with([
            'user',
            'placements.internshipPosting.companyProfile',
            'placementRecommendations.internshipPosting.companyProfile',
        ]);

        if ($search = $request->input('search')) {
            $query->where(fn ($q) => $q->where('first_name', 'like', "%{$search}%")
                ->orWhere('last_name', 'like', "%{$search}%")
                ->orWhere('student_id_number', 'like', "%{$search}%")
                ->orWhere('course', 'like', "%{$search}%"));
        }

        if ($status = $request->input('placement_status')) {
            if ($status === 'placed') {
                $query->whereHas('placements', fn ($q) => $q->where('status', 'active'));
            } elseif ($status === 'completed') {
                $query->whereHas('placements', fn ($q) => $q->where('status', 'completed'));
            } elseif ($status === 'unplaced') {
                $query->whereDoesntHave('placements');
            }
        }

        $students = $query->paginate(10)->withQueryString();

        return view('coordinator.students.index', compact('students'));
    }

    public function show(StudentProfile $studentProfile): View
    {
        $studentProfile->load([
            'user',
            'skills',
            'applications.internshipPosting.companyProfile',
            'placements.internshipPosting.companyProfile',
            'placements.attendanceLogs',
            'placements.tasks',
            'placementRecommendations.internshipPosting.companyProfile',
            'evaluations',
        ]);

        return view('coordinator.students.show', compact('studentProfile'));
    }
}
