<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Models\InternshipTask;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

class TaskController extends Controller
{
    public function index(Request $request): View
    {
        $student = $request->user()->studentProfile;

        $placement = $student
            ? $student->placements()->where('status', 'active')->latest()->first()
            : null;

        $tasks = $placement
            ? $placement->tasks()->orderBy('due_date')->get()
            : collect();

        return view('student.tasks.index', compact('placement', 'tasks'));
    }

    public function update(Request $request, InternshipTask $internshipTask): RedirectResponse
    {
        $student = $request->user()->studentProfile;
        abort_if(! $student || $internshipTask->internshipPlacement->student_profile_id !== $student->id, 403);

        $validated = $request->validate([
            'status' => ['required', 'in:in_progress,completed'],
            'student_notes' => ['nullable', 'string', 'max:2000'],
            'output_file' => ['nullable', 'file', 'mimes:pdf,doc,docx,zip,jpg,png', 'max:10240'],
        ]);

        $data = [
            'status' => $validated['status'],
            'student_notes' => $validated['student_notes'] ?? $internshipTask->student_notes,
        ];

        if ($validated['status'] === 'completed') {
            $data['completed_at'] = now();
        }

        if ($request->hasFile('output_file')) {
            $path = $request->file('output_file')->store('task-outputs', 'public');
            $data['output_file_path'] = $path;
        }

        $internshipTask->update($data);

        return back()->with('success', 'Task updated successfully.');
    }
}
