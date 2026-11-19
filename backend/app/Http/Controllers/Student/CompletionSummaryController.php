<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\View\View;

class CompletionSummaryController extends Controller
{
    public function index(Request $request): View
    {
        $student = $request->user()->studentProfile;

        $placements = $student
            ? $student->placements()
                ->with([
                    'internshipPosting.companyProfile',
                    'evaluations',
                    'attendanceLogs',
                    'tasks',
                    'weeklyLogs',
                    'companyRating',
                ])
                ->latest()
                ->get()
            : collect();

        // Build summary per placement
        $summaries = $placements->map(function ($pl) {
            $midterm = $pl->evaluations->where('evaluation_period', 'midterm')->first();
            $final = $pl->evaluations->where('evaluation_period', 'final')->first();

            return [
                'placement' => $pl,
                'rendered_hours' => $pl->rendered_hours,
                'required_hours' => $pl->required_hours,
                'completion_pct' => $pl->completion_percentage,
                'attendance_days' => $pl->attendanceLogs->count(),
                'present_days' => $pl->attendanceLogs->whereIn('status', ['present', 'late', 'half_day'])->count(),
                'total_tasks' => $pl->tasks->count(),
                'completed_tasks' => $pl->tasks->where('status', 'completed')->count(),
                'weekly_logs' => $pl->weeklyLogs->where('status', 'submitted')->count(),
                'midterm_rating' => $midterm?->overall_rating,
                'midterm_grade' => $midterm?->grade_description,
                'final_rating' => $final?->overall_rating,
                'final_grade' => $final?->grade_description,
                'recommendation' => $final?->recommendation ?? $midterm?->recommendation,
                'company_rated' => $pl->companyRating !== null,
                'is_complete' => $pl->status === 'completed' && $final !== null,
            ];
        });

        return view('student.completion-summary.index', compact('student', 'summaries'));
    }
}
