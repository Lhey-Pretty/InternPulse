<?php

namespace App\Http\Controllers\Coordinator;

use App\Http\Controllers\Controller;
use App\Models\CompanyProfile;
use App\Models\Evaluation;
use App\Models\InternshipPlacement;
use App\Models\StudentProfile;
use Illuminate\Http\Request;
use Illuminate\View\View;

class ReportController extends Controller
{
    public function index(Request $request): View
    {
        $reportType = $request->input('type', 'deployment');
        $course = $request->input('course');
        $status = $request->input('status');

        if ($reportType === 'companies') {
            $query = CompanyProfile::withCount([
                'internshipPostings as active_interns_count' => fn ($q) => $q->whereHas('placements', fn ($pq) => $pq->where('status', 'active')),
            ])->withCount('internshipPostings');

            if ($search = $request->input('search')) {
                $query->where('company_name', 'like', "%{$search}%");
            }

            $items = $query->orderBy('company_name')->paginate(10)->withQueryString();
        } elseif ($reportType === 'evaluations') {
            $query = Evaluation::with([
                'studentProfile.user',
                'internshipPlacement.internshipPosting.companyProfile',
            ]);

            if ($course) {
                $query->whereHas('studentProfile', fn ($q) => $q->where('course', $course));
            }

            if ($search = $request->input('search')) {
                $query->whereHas('studentProfile', fn ($q) => $q->where('first_name', 'like', "%{$search}%")->orWhere('last_name', 'like', "%{$search}%"));
            }

            $items = $query->latest('submitted_at')->paginate(10)->withQueryString();
        } else {
            // 'deployment' and 'dtr'
            $query = InternshipPlacement::with([
                'studentProfile.user',
                'internshipPosting.companyProfile',
            ]);

            if ($course) {
                $query->whereHas('studentProfile', fn ($q) => $q->where('course', $course));
            }

            if ($status) {
                $query->where('status', $status);
            }

            if ($search = $request->input('search')) {
                $query->whereHas('studentProfile', fn ($q) => $q->where('first_name', 'like', "%{$search}%")->orWhere('last_name', 'like', "%{$search}%"));
            }

            $items = $query->latest('start_date')->paginate(10)->withQueryString();
        }

        $reportTitles = [
            'deployment' => 'Official OJT Trainee Deployment Masterlist',
            'dtr' => 'Trainee Rendered Hours & DTR Summary',
            'companies' => 'Accredited Partner Companies Directory',
            'evaluations' => 'Student Performance & Evaluation Summary',
        ];

        return view('coordinator.reports.index', [
            'items' => $items,
            'reportType' => $reportType,
            'reportTitle' => $reportTitles[$reportType] ?? $reportTitles['deployment'],
            'course' => $course,
            'status' => $status,
        ]);
    }
}
