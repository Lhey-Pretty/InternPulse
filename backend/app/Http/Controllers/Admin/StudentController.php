<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\StudentProfile;
use Illuminate\Http\Request;
use Illuminate\View\View;

class StudentController extends Controller
{
    public function index(Request $request): View
    {
        $query = StudentProfile::with(['user', 'placements.internshipPosting.companyProfile']);

        if ($search = $request->input('search')) {
            $query->where(fn ($q) => $q
                ->where('first_name', 'like', "%{$search}%")
                ->orWhere('last_name', 'like', "%{$search}%")
                ->orWhere('student_id_number', 'like', "%{$search}%")
                ->orWhere('course', 'like', "%{$search}%"));
        }

        if ($status = $request->input('placement_status')) {
            match ($status) {
                'placed' => $query->whereHas('placements', fn ($q) => $q->where('status', 'active')),
                'completed' => $query->whereHas('placements', fn ($q) => $q->where('status', 'completed')),
                'unplaced' => $query->whereDoesntHave('placements'),
                default => null,
            };
        }

        $students = $query->paginate(10)->withQueryString();

        $stats = [
            'total' => StudentProfile::count(),
            'placed' => StudentProfile::whereHas('placements', fn ($q) => $q->where('status', 'active'))->count(),
            'completed' => StudentProfile::whereHas('placements', fn ($q) => $q->where('status', 'completed'))->count(),
            'unplaced' => StudentProfile::whereDoesntHave('placements')->count(),
        ];

        return view('admin.students.index', compact('students', 'stats'));
    }

    public function show(StudentProfile $studentProfile): View
    {
        $studentProfile->load([
            'user',
            'skills',
            'placements.internshipPosting.companyProfile',
            'placements.evaluations',
            'placements.attendanceLogs',
            'applications.internshipPosting.companyProfile',
        ]);

        $activePlacement = $studentProfile->placements->where('status', 'active')->first();

        return view('admin.students.show', compact('studentProfile', 'activePlacement'));
    }
}
