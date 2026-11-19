<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Models\SystemSetting;
use Illuminate\Http\Request;
use Illuminate\View\View;

class PerformanceDashboardController extends Controller
{
    public function index(Request $request): View
    {
        $student = $request->user()->studentProfile;
        $placement = $student?->placements()
            ->with(['internshipPosting.companyProfile', 'attendanceLogs', 'tasks', 'evaluations', 'weeklyLogs'])
            ->whereIn('status', ['active', 'completed'])
            ->latest()
            ->first();

        $stats = [
            'rendered_hours' => 0,
            'required_hours' => (int) SystemSetting::get('default_required_hours', 480),
            'completion_pct' => 0,
            'attendance_days' => 0,
            'present_days' => 0,
            'attendance_rate' => 0,
            'total_tasks' => 0,
            'completed_tasks' => 0,
            'task_completion_rate' => 0,
            'weekly_logs' => 0,
            'midterm_rating' => null,
            'final_rating' => null,
            'overall_rating' => null,
        ];

        $evaluationCriteria = [];
        $attendanceByMonth = [];
        $taskProgress = [];

        if ($placement) {
            $logs = $placement->attendanceLogs;
            $tasks = $placement->tasks;

            $stats['rendered_hours'] = $placement->rendered_hours;
            $stats['required_hours'] = $placement->required_hours;
            $stats['completion_pct'] = $placement->completion_percentage;
            $stats['attendance_days'] = $logs->count();
            $stats['present_days'] = $logs->whereIn('status', ['present', 'late', 'half_day'])->count();
            $stats['attendance_rate'] = $stats['attendance_days'] > 0
                ? round(($stats['present_days'] / $stats['attendance_days']) * 100, 1) : 0;
            $stats['total_tasks'] = $tasks->count();
            $stats['completed_tasks'] = $tasks->where('status', 'completed')->count();
            $stats['task_completion_rate'] = $stats['total_tasks'] > 0
                ? round(($stats['completed_tasks'] / $stats['total_tasks']) * 100, 1) : 0;
            $stats['weekly_logs'] = $placement->weeklyLogs->where('status', 'submitted')->count();

            $midterm = $placement->evaluations->where('evaluation_period', 'midterm')->first();
            $final = $placement->evaluations->where('evaluation_period', 'final')->first();

            $stats['midterm_rating'] = $midterm?->overall_rating;
            $stats['final_rating'] = $final?->overall_rating;
            $stats['overall_rating'] = $final?->overall_rating ?? $midterm?->overall_rating;

            if ($final ?? $midterm) {
                $eval = $final ?? $midterm;
                $evaluationCriteria = [
                    'Work Quality' => $eval->work_quality,
                    'Work Quantity' => $eval->work_quantity,
                    'Punctuality' => $eval->punctuality,
                    'Attendance' => $eval->attendance_score,
                    'Initiative' => $eval->initiative,
                    'Teamwork' => $eval->teamwork,
                    'Communication' => $eval->communication,
                    'Problem Solving' => $eval->problem_solving,
                    'Technical Skills' => $eval->technical_skills,
                    'Professionalism' => $eval->professionalism,
                ];
            }

            // Attendance by month for chart
            $attendanceByMonth = $logs->groupBy(fn ($l) => $l->date->format('M Y'))
                ->map(fn ($group) => $group->sum('hours_rendered'))
                ->toArray();

            // Task progress by status
            $taskProgress = [
                'Completed' => $tasks->where('status', 'completed')->count(),
                'In Progress' => $tasks->where('status', 'in_progress')->count(),
                'Pending' => $tasks->where('status', 'pending')->count(),
                'Overdue' => $tasks->where('status', 'overdue')->count(),
            ];
        }

        return view('student.performance.index', compact(
            'student', 'placement', 'stats',
            'evaluationCriteria', 'attendanceByMonth', 'taskProgress'
        ));
    }
}
