<?php

namespace App\Http\Controllers\Company;

use App\Http\Controllers\Controller;
use App\Models\InternshipPlacement;
use App\Models\JournalEntry;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

class JournalReviewController extends Controller
{
    public function index(Request $request): View
    {
        $company = $request->user()->companyProfile;
        $postingIds = $company ? $company->internshipPostings()->pluck('id') : collect();

        // Load all active/completed placements with their journal entries
        $placements = InternshipPlacement::whereIn('internship_posting_id', $postingIds)
            ->with([
                'studentProfile',
                'internshipPosting',
                'journalEntries' => fn ($q) => $q->orderByDesc('entry_date'),
            ])
            ->whereIn('status', ['active', 'completed'])
            ->get();

        return view('company.journal-review.index', compact('placements'));
    }

    public function show(Request $request, JournalEntry $journalEntry): View
    {
        $this->authorizeJournal($request, $journalEntry);

        return view('company.journal-review.show', compact('journalEntry'));
    }

    public function verify(Request $request, JournalEntry $journalEntry): RedirectResponse
    {
        $this->authorizeJournal($request, $journalEntry);

        // Supervisor verifies by adding remarks
        $validated = $request->validate([
            'supervisor_remarks' => ['nullable', 'string', 'max:1000'],
        ]);

        $journalEntry->update(array_merge($validated, [
            'is_verified' => true,
        ]));

        return back()->with('success', 'Journal entry verified.');
    }

    private function authorizeJournal(Request $request, JournalEntry $journalEntry): void
    {
        $company = $request->user()->companyProfile;
        $postingIds = $company ? $company->internshipPostings()->pluck('id') : collect();

        $valid = InternshipPlacement::where('id', $journalEntry->internship_placement_id)
            ->whereIn('internship_posting_id', $postingIds)
            ->exists();

        abort_if(! $valid, 403);
    }
}
