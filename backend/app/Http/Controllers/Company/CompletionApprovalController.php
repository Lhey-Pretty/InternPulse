<?php

namespace App\Http\Controllers\Company;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\InternshipPlacement;
use App\Models\Notification;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

class CompletionApprovalController extends Controller
{
    public function index(Request $request): View
    {
        $company = $request->user()->companyProfile;
        $postingIds = $company ? $company->internshipPostings()->pluck('id') : collect();

        $placements = InternshipPlacement::whereIn('internship_posting_id', $postingIds)
            ->with(['studentProfile', 'internshipPosting', 'evaluations', 'attendanceLogs'])
            ->whereIn('status', ['active', 'completed'])
            ->latest()
            ->paginate(10);

        return view('company.completion.index', compact('placements'));
    }

    public function show(Request $request, InternshipPlacement $placement): View
    {
        $this->authorizePlacement($request, $placement);

        $placement->load([
            'studentProfile',
            'internshipPosting.companyProfile',
            'evaluations',
            'attendanceLogs',
            'tasks',
            'weeklyLogs',
            'journalEntries',
        ]);

        $missingRequirements = [];
        if ($placement->rendered_hours < $placement->required_hours) {
            $missingRequirements[] = "Incomplete hours: {$placement->rendered_hours}/{$placement->required_hours}h";
        }
        if (! $placement->evaluations->where('evaluation_period', 'final')->count()) {
            $missingRequirements[] = 'Final evaluation not submitted';
        }

        return view('company.completion.show', compact('placement', 'missingRequirements'));
    }

    public function approve(Request $request, InternshipPlacement $placement): RedirectResponse
    {
        $this->authorizePlacement($request, $placement);

        if ($placement->status === 'completed') {
            return back()->with('error', 'This placement is already marked as completed.');
        }

        $validated = $request->validate([
            'completion_notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $placement->update([
            'status' => 'completed',
            'completed_at' => now(),
            'completion_approved_by' => $request->user()->id,
            'completion_notes' => $validated['completion_notes'] ?? null,
        ]);

        Notification::send(
            $placement->studentProfile->user_id,
            'placement_completed',
            'Internship Completed',
            "Congratulations! Your internship at {$placement->internshipPosting->companyProfile->company_name} has been marked as completed by your supervisor."
        );

        AuditLog::record('placement.completed', $placement, [
            'approved_by' => $request->user()->name,
        ]);

        return redirect()->route('company.completion.index')
            ->with('success', 'Internship completion approved. Student has been notified.');
    }

    private function authorizePlacement(Request $request, InternshipPlacement $placement): void
    {
        $company = $request->user()->companyProfile;
        $postingIds = $company ? $company->internshipPostings()->pluck('id') : collect();

        abort_if(! $postingIds->contains($placement->internship_posting_id), 403);
    }
}
