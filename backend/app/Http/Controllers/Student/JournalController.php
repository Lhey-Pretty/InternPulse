<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Models\JournalEntry;
use App\Services\JournalClassificationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

class JournalController extends Controller
{
    public function index(Request $request): View
    {
        $student = $request->user()->studentProfile;
        $placement = $student?->placements()->where('status', 'active')->latest()->first();

        $entries = $placement
            ? $placement->journalEntries()
                ->orderByDesc('entry_date')
                ->paginate(10)
            : collect();

        $todayEntry = $placement
            ? $placement->journalEntries()->where('entry_date', today()->toDateString())->first()
            : null;

        return view('student.journal.index', compact('placement', 'entries', 'todayEntry'));
    }

    public function create(Request $request): View|RedirectResponse
    {
        $student = $request->user()->studentProfile;
        $placement = $student?->placements()->where('status', 'active')->latest()->first();

        abort_if(! $placement, 404, 'No active placement found.');

        // Prevent writing journals before the placement start date
        if (today()->lt($placement->start_date->startOfDay())) {
            return redirect()->route('student.journal.index')
                ->with('error', "Your internship training period officially begins on {$placement->start_date->format('F d, Y')}. Journal writing will be available on your approved start date.");
        }

        $existing = $placement->journalEntries()
            ->where('entry_date', today()->toDateString())
            ->first();

        return view('student.journal.create', compact('placement', 'existing'));
    }

    public function store(Request $request): RedirectResponse
    {
        $student = $request->user()->studentProfile;
        $placement = $student?->placements()->where('status', 'active')->latest()->first();

        abort_if(! $placement, 404);

        // Prevent submitting journals before the placement start date
        if (today()->lt($placement->start_date->startOfDay())) {
            return redirect()->route('student.journal.index')
                ->with('error', "Your internship training period officially begins on {$placement->start_date->format('F d, Y')}. You cannot submit journal entries yet.");
        }

        $validated = $request->validate([
            'entry_date' => ['required', 'date'],
            'title' => ['required', 'string', 'max:200'],
            'content' => ['required', 'string', 'max:5000'],
            'reflection' => ['nullable', 'string', 'max:2000'],
            'mood' => ['nullable', 'in:excellent,good,neutral,difficult,challenging'],
        ]);

        if (\Carbon\Carbon::parse($validated['entry_date'])->lt($placement->start_date->startOfDay())) {
            return back()->with('error', "Journal entry date cannot be earlier than your placement start date ({$placement->start_date->format('F d, Y')}).");
        }

        $existing = $placement->journalEntries()
            ->where('entry_date', $validated['entry_date'])
            ->first();

        if ($existing) {
            return back()->with('error', "You already have a journal entry for {$validated['entry_date']}.");
        }

        $journalEntry = JournalEntry::create(array_merge($validated, [
            'internship_placement_id' => $placement->id,
            'student_profile_id' => $student->id,
        ]));

        // Trigger ML classification (async, non-blocking)
        JournalClassificationService::classifyJournalEntry($journalEntry);

        return redirect()->route('student.journal.index')
            ->with('success', 'Journal entry saved.');
    }

    public function show(Request $request, JournalEntry $journalEntry): View
    {
        $student = $request->user()->studentProfile;
        abort_if(! $student || $journalEntry->student_profile_id !== $student->id, 403);

        return view('student.journal.show', compact('journalEntry'));
    }

    public function edit(Request $request, JournalEntry $journalEntry): View
    {
        $student = $request->user()->studentProfile;
        abort_if(! $student || $journalEntry->student_profile_id !== $student->id, 403);
        abort_if(! $journalEntry->entry_date->isToday(), 403, 'Journal entries can only be edited on the day they are created.');

        return view('student.journal.edit', compact('journalEntry'));
    }

    public function update(Request $request, JournalEntry $journalEntry): RedirectResponse
    {
        $student = $request->user()->studentProfile;
        abort_if(! $student || $journalEntry->student_profile_id !== $student->id, 403);
        abort_if(! $journalEntry->entry_date->isToday(), 403, 'Journal entries can only be edited on the day they are created.');

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:200'],
            'content' => ['required', 'string', 'max:5000'],
            'reflection' => ['nullable', 'string', 'max:2000'],
            'mood' => ['nullable', 'in:excellent,good,neutral,difficult,challenging'],
        ]);

        $journalEntry->update($validated);

        // Re-trigger ML classification after update (async, non-blocking)
        JournalClassificationService::classifyJournalEntry($journalEntry);

        return redirect()->route('student.journal.show', $journalEntry)
            ->with('success', 'Journal entry updated.');
    }
}
