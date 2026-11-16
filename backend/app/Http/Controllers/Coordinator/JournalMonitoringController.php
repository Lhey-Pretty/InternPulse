<?php

namespace App\Http\Controllers\Coordinator;

use App\Http\Controllers\Controller;
use App\Models\InternshipPlacement;
use App\Models\JournalEntry;
use App\Models\StudentProfile;
use App\Services\MLService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

class JournalMonitoringController extends Controller
{
    public function __construct(
        protected MLService $mlService
    ) {}

    /**
     * Display all student journals with NLP AI Analysis & Filters.
     */
    public function index(Request $request): View
    {
        $filters = function ($query) use ($request): void {
            if ($course = $request->input('course')) {
                $query->whereHas('studentProfile', fn ($q) => $q->where('course', $course));
            }

            if ($search = $request->input('search')) {
                $query->where(function ($q) use ($search) {
                    $q->where('title', 'like', "%{$search}%")
                        ->orWhere('content', 'like', "%{$search}%")
                        ->orWhereHas('studentProfile.user', fn ($u) => $u->where('name', 'like', "%{$search}%"));
                });
            }
        };

        $studentId = $request->integer('student_id');

        if ($studentId) {
            $query = JournalEntry::with([
                'studentProfile.user',
                'internshipPlacement.internshipPosting.companyProfile',
            ])->where('student_profile_id', $studentId);
            $filters($query);
            $entries = $query->latest('entry_date')->paginate(10)->withQueryString();
            $students = null;
        } else {
            $studentQuery = StudentProfile::with('user')
                ->withCount(['journals' => function ($query) use ($filters): void {
                    if ($course = request('course')) {
                        $query->whereHas('studentProfile', fn ($q) => $q->where('course', $course));
                    }
                }])
                ->whereHas('journals', function ($query) use ($request): void {
                    if ($course = $request->input('course')) {
                        $query->whereHas('studentProfile', fn ($q) => $q->where('course', $course));
                    }
                })
                ->orderBy('first_name')
                ->orderBy('last_name');

            $students = $studentQuery->paginate(10)->withQueryString();
            $entries = null;
        }

        // Run ML NLP Analysis on displayed entries
        if ($entries) {
            foreach ($entries as $entry) {
                $course = $entry->studentProfile->course ?? 'BSIT';
                $fullText = $entry->title . " " . $entry->content . " " . ($entry->reflection ?? '');

                $entry->nlp_analysis = $this->mlService->analyzeJournal($course, $fullText);
            }
        }

        return view('coordinator.journals.index', compact('entries', 'students', 'studentId'));
    }

    /**
     * Show a detailed journal entry with AI insights.
     */
    public function show(JournalEntry $journalEntry): View
    {
        $journalEntry->load([
            'studentProfile.user',
            'internshipPlacement.internshipPosting.companyProfile'
        ]);

        $course = $journalEntry->studentProfile->course ?? 'BSIT';
        $fullText = $journalEntry->title . " " . $journalEntry->content . " " . ($journalEntry->reflection ?? '');
        $nlpAnalysis = $this->mlService->analyzeJournal($course, $fullText);

        return view('coordinator.journals.show', compact('journalEntry', 'nlpAnalysis'));
    }

    /**
     * Coordinator adds academic remarks / guidance.
     */
    public function addRemarks(Request $request, JournalEntry $journalEntry): RedirectResponse
    {
        if (! $journalEntry->entry_date->isToday()) {
            return back()->with('error', 'Coordinator remarks can only be edited on the journal entry date.');
        }

        $validated = $request->validate([
            'supervisor_remarks' => ['required', 'string', 'max:1000'],
        ]);

        $journalEntry->update([
            'supervisor_remarks' => $validated['supervisor_remarks'],
            'is_verified' => true,
        ]);

        return back()->with('success', 'Coordinator remarks added and journal marked as reviewed.');
    }
}
