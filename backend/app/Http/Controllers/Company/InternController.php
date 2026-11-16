<?php

namespace App\Http\Controllers\Company;

use App\Http\Controllers\Controller;
use App\Models\AttendanceLog;
use App\Models\InternshipPlacement;
use App\Models\InternshipTask;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

class InternController extends Controller
{
    public function index(Request $request): View
    {
        $company = $request->user()->companyProfile;

        $postingIds = $company ? $company->internshipPostings()->pluck('id') : collect();

        $placements = InternshipPlacement::whereIn('internship_posting_id', $postingIds)
            ->with(['studentProfile', 'internshipPosting'])
            ->when($request->input('status'), fn ($q, $status) => $q->where('status', $status))
            ->latest()
            ->paginate(10)
            ->withQueryString();

        return view('company.interns.index', compact('placements'));
    }

    public function attendanceApprovals(Request $request): View
    {
        $company = $request->user()->companyProfile;
        $postingIds = $company ? $company->internshipPostings()->pluck('id') : collect();

        $placements = InternshipPlacement::whereIn('internship_posting_id', $postingIds)
            ->where('status', 'active')
            ->with([
                'studentProfile',
                'internshipPosting',
                'attendanceLogs' => fn ($q) => $q->orderByDesc('date')->orderByDesc('created_at'),
            ])
            ->when($request->input('search'), function ($q, $search) {
                $q->whereHas('studentProfile', function ($sq) use ($search) {
                    $sq->where('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
                        ->orWhere('student_id_number', 'like', "%{$search}%");
                });
            })
            ->latest()
            ->paginate(10)
            ->withQueryString();

        return view('company.attendance.index', compact('placements'));
    }

    public function studentAttendance(Request $request, InternshipPlacement $placement): View
    {
        $this->authorizePlacement($request, $placement);

        $placement->load(['studentProfile', 'internshipPosting']);

        $attendanceLogs = $placement->attendanceLogs()
            ->when($request->input('date'), fn ($q, $date) => $q->whereDate('date', $date))
            ->when($request->input('status') === 'pending', fn ($q) => $q
                ->where(fn ($q2) => $q2
                    ->whereNull('time_in_approved_at')
                    ->orWhere(fn ($q3) => $q3
                        ->whereNotNull('time_out')
                        ->whereNull('time_out_approved_at')
                    )
                )
            )
            ->when($request->input('status') === 'approved', fn ($q) => $q
                ->whereNotNull('time_in_approved_at')
                ->whereNotNull('time_out_approved_at')
            )
            ->orderByDesc('date')
            ->orderByDesc('created_at')
            ->paginate(10)
            ->withQueryString();

        return view('company.attendance.show', compact('placement', 'attendanceLogs'));
    }

    public function show(Request $request, InternshipPlacement $placement): View
    {
        $this->authorizePlacement($request, $placement);

        $placement->load(['studentProfile.skills', 'internshipPosting', 'tasks', 'attendanceLogs', 'evaluations']);

        return view('company.interns.show', compact('placement'));
    }

    public function addTask(Request $request, InternshipPlacement $placement): RedirectResponse
    {
        $this->authorizePlacement($request, $placement);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:200'],
            'description' => ['nullable', 'string', 'max:2000'],
            'due_date' => ['nullable', 'date'],
        ]);

        InternshipTask::create(array_merge($validated, [
            'internship_placement_id' => $placement->id,
            'status' => 'pending',
        ]));

        return back()->with('success', 'Task assigned successfully.');
    }

    public function updateTaskFeedback(Request $request, InternshipTask $task): RedirectResponse
    {
        $this->authorizePlacement($request, $task->internshipPlacement);

        $validated = $request->validate([
            'supervisor_feedback' => ['required', 'string', 'max:2000'],
        ]);

        $task->update($validated);

        return back()->with('success', 'Feedback saved.');
    }

    public function approveTimeIn(Request $request, AttendanceLog $attendanceLog): RedirectResponse
    {
        $attendanceLog->load('internshipPlacement');
        $this->authorizePlacement($request, $attendanceLog->internshipPlacement);

        abort_if(! $attendanceLog->time_in || $attendanceLog->time_in_approved_at, 422, 'This time-in does not need approval.');

        $attendanceLog->update([
            'time_in_approved_by' => $request->user()->id,
            'time_in_approved_at' => now(),
        ]);

        $this->recalculateRenderedHours($attendanceLog->internshipPlacement);

        return back()->with('success', 'Time-in approved.');
    }

    public function approveTimeOut(Request $request, AttendanceLog $attendanceLog): RedirectResponse
    {
        $attendanceLog->load('internshipPlacement');
        $this->authorizePlacement($request, $attendanceLog->internshipPlacement);

        abort_if(
            ! $attendanceLog->time_out || ! $attendanceLog->time_in_approved_at || $attendanceLog->time_out_approved_at,
            422,
            'This time-out does not need approval.'
        );

        $attendanceLog->update([
            'time_out_approved_by' => $request->user()->id,
            'time_out_approved_at' => now(),
            'hours_rendered' => $this->calculateHours($attendanceLog),
        ]);

        $this->recalculateRenderedHours($attendanceLog->internshipPlacement);

        return back()->with('success', 'Time-out approved.');
    }

    private function calculateHours(AttendanceLog $attendanceLog): float
    {
        $in = \Carbon\Carbon::parse($attendanceLog->time_in);
        $out = \Carbon\Carbon::parse($attendanceLog->time_out);

        return round($in->floatDiffInHours($out), 2);
    }

    private function recalculateRenderedHours(InternshipPlacement $placement): void
    {
        $totalHours = $placement->attendanceLogs()
            ->whereNotNull('time_in_approved_at')
            ->whereNotNull('time_out_approved_at')
            ->sum('hours_rendered');

        $placement->update(['rendered_hours' => (int) round($totalHours)]);
    }

    private function authorizePlacement(Request $request, InternshipPlacement $placement): void
    {
        $company = $request->user()->companyProfile;
        $postingIds = $company ? $company->internshipPostings()->pluck('id') : collect();

        abort_if(! $postingIds->contains($placement->internship_posting_id), 403);
    }
}
