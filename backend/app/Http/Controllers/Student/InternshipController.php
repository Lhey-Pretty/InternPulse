<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Models\InternshipPosting;
use Illuminate\Http\Request;
use Illuminate\View\View;

class InternshipController extends Controller
{
    public function index(Request $request): View
    {
        $student = $request->user()->studentProfile;

        $query = InternshipPosting::with('companyProfile')
            ->where('status', 'approved')
            ->where(fn ($q) => $q->whereNull('application_deadline')
                ->orWhere('application_deadline', '>=', now()->toDateString()));

        if ($search = $request->input('search')) {
            $query->where(fn ($q) => $q->where('title', 'like', "%{$search}%")
                ->orWhere('position', 'like', "%{$search}%")
                ->orWhere('location', 'like', "%{$search}%")
                ->orWhereHas('companyProfile', fn ($q) => $q->where('company_name', 'like', "%{$search}%")));
        }

        if ($course = $request->input('course')) {
            $query->where('required_course', 'like', "%{$course}%");
        }

        if ($setup = $request->input('work_setup')) {
            $query->where('work_setup', $setup);
        }

        $postings = $query->latest()->paginate(10)->withQueryString();

        $appliedPostingIds = $student
            ? $student->applications()->pluck('internship_posting_id')->toArray()
            : [];

        return view('student.internships.index', compact('postings', 'appliedPostingIds', 'student'));
    }

    public function show(Request $request, InternshipPosting $internshipPosting): View
    {
        $internshipPosting->load('companyProfile');

        $student = $request->user()->studentProfile;

        $application = $student
            ? $student->applications()->where('internship_posting_id', $internshipPosting->id)->first()
            : null;

        return view('student.internships.show', compact('internshipPosting', 'application', 'student'));
    }
}
