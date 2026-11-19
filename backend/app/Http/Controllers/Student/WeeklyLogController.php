<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Models\WeeklyLog;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

class WeeklyLogController extends Controller
{
    public function index(Request $request): View
    {
        $student = $request->user()->studentProfile;
        $placement = $student?->placements()->where('status', 'active')->latest()->first();

        $logs = $placement
            ? $placement->weeklyLogs()->orderByDesc('week_number')->get()
            : collect();

        return view('student.weekly-log.index', compact('placement', 'logs'));
    }

    public function create(Request $request): View
    {
        $student = $request->user()->studentProfile;
        $placement = $student?->placements()->where('status', 'active')->latest()->first();

        abort_if(! $placement, 404, 'No active placement found.');

        $latestWeek = $placement->weeklyLogs()->max('week_number') ?? 0;
        $nextWeek = $latestWeek + 1;

        $weekStart = $placement->start_date->addWeeks($latestWeek)->startOfWeek();
        $weekEnd = $weekStart->copy()->endOfWeek();

        return view('student.weekly-log.create', compact('placement', 'nextWeek', 'weekStart', 'weekEnd'));
    }

    public function store(Request $request): RedirectResponse
    {
        $student = $request->user()->studentProfile;
        $placement = $student?->placements()->where('status', 'active')->latest()->first();

        abort_if(! $placement, 404);

        $validated = $request->validate([
            'week_number' => ['required', 'integer', 'min:1'],
            'week_start' => ['required', 'date'],
            'week_end' => ['required', 'date', 'after:week_start'],
            'activities_done' => ['required', 'string', 'max:3000'],
            'learnings' => ['nullable', 'string', 'max:2000'],
            'challenges' => ['nullable', 'string', 'max:2000'],
            'hours_this_week' => ['required', 'numeric', 'min:0', 'max:60'],
        ]);

        $alreadyExists = $placement->weeklyLogs()
            ->where('week_number', $validated['week_number'])
            ->exists();

        if ($alreadyExists) {
            return back()->with('error', "Week {$validated['week_number']} log already submitted.");
        }

        WeeklyLog::create(array_merge($validated, [
            'internship_placement_id' => $placement->id,
            'student_profile_id' => $student->id,
            'status' => 'submitted',
            'submitted_at' => now(),
        ]));

        return redirect()->route('student.weekly-log.index')
            ->with('success', "Week {$validated['week_number']} log submitted successfully.");
    }

    public function show(Request $request, WeeklyLog $weeklyLog): View
    {
        $student = $request->user()->studentProfile;
        abort_if(! $student || $weeklyLog->student_profile_id !== $student->id, 403);

        return view('student.weekly-log.show', compact('weeklyLog'));
    }
}
