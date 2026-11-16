<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Models\AttendanceLog;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

class AttendanceController extends Controller
{
    public function index(Request $request): View
    {
        $student = $request->user()->studentProfile;

        $placement = $student
            ? $student->placements()->where('status', 'active')->latest()->first()
            : null;

        $logs = $placement
            ? $placement->attendanceLogs()->orderByDesc('date')->paginate(10)
            : collect();

        $todayLog = $placement
            ? $placement->attendanceLogs()->where('date', today()->toDateString())->first()
            : null;

        return view('student.attendance.index', compact('placement', 'logs', 'todayLog'));
    }

    public function store(Request $request): RedirectResponse
    {
        $student = $request->user()->studentProfile;
        $placement = $student?->placements()->where('status', 'active')->latest()->first();

        if (! $placement) {
            return back()->with('error', 'No active internship placement found.');
        }

        $exists = $placement->attendanceLogs()->where('date', today()->toDateString())->exists();
        if ($exists) {
            return back()->with('error', 'Attendance for today has already been logged.');
        }

        $validated = $request->validate([
            'time_in' => ['required', 'date_format:H:i'],
            'time_out' => ['nullable', 'date_format:H:i', 'after:time_in'],
            'remarks' => ['nullable', 'string', 'max:500'],
        ]);

        $log = AttendanceLog::create([
            'internship_placement_id' => $placement->id,
            'student_profile_id' => $student->id,
            'date' => today()->toDateString(),
            'time_in' => $validated['time_in'],
            'time_out' => $validated['time_out'] ?? null,
            'hours_rendered' => null,
            'status' => 'present',
            'remarks' => $validated['remarks'] ?? null,
        ]);

        // Update total rendered hours
        $totalHours = $placement->attendanceLogs()
            ->whereNotNull('time_in_approved_at')
            ->whereNotNull('time_out_approved_at')
            ->sum('hours_rendered');
        $placement->update(['rendered_hours' => (int) round($totalHours)]);

        return redirect()->route('student.attendance.index')
            ->with('success', 'Attendance logged successfully.');
    }

    public function timeout(Request $request, AttendanceLog $attendanceLog): RedirectResponse
    {
        $student = $request->user()->studentProfile;
        abort_if(! $student || $attendanceLog->student_profile_id !== $student->id, 403);

        $validated = $request->validate([
            'time_out' => ['required', 'date_format:H:i'],
        ]);

        $in = Carbon::parse($attendanceLog->time_in);
        $out = Carbon::createFromFormat('H:i', $validated['time_out']);
        $hoursRendered = round($in->floatDiffInHours($out), 2);

        $attendanceLog->update([
            'time_out' => $validated['time_out'],
            'hours_rendered' => $hoursRendered, // Always save calculated hours
            'time_out_approved_at' => null,
            'time_out_approved_by' => null,
        ]);

        // Recalculate total hours
        $placement = $attendanceLog->internshipPlacement;
        $totalHours = $placement->attendanceLogs()
            ->whereNotNull('time_in_approved_at')
            ->whereNotNull('time_out_approved_at')
            ->sum('hours_rendered');
        $placement->update(['rendered_hours' => (int) round($totalHours)]);

        return back()->with('success', 'Time-out recorded.');
    }
}
