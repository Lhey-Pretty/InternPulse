<?php

namespace App\Http\Controllers\Coordinator;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\InternshipPosting;
use App\Models\Notification;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

class PostingController extends Controller
{
    public function index(Request $request): View
    {
        $query = InternshipPosting::with('companyProfile');

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        $postings = $query->latest()->paginate(10)->withQueryString();

        return view('coordinator.postings.index', compact('postings'));
    }

    public function show(InternshipPosting $internshipPosting): View
    {
        $internshipPosting->load('companyProfile');

        return view('coordinator.postings.show', compact('internshipPosting'));
    }

    public function approve(Request $request, InternshipPosting $internshipPosting): RedirectResponse
    {
        $internshipPosting->update([
            'status' => 'approved',
            'approved_by' => $request->user()->id,
            'approved_at' => now(),
            'rejection_reason' => null,
        ]);

        Notification::send(
            $internshipPosting->companyProfile->user_id,
            'posting_approved',
            'Internship Posting Approved',
            "Your internship posting \"{$internshipPosting->title}\" has been approved and is now visible to students."
        );

        AuditLog::record('posting.approved', $internshipPosting);

        return back()->with('success', 'Posting approved.');
    }

    public function reject(Request $request, InternshipPosting $internshipPosting): RedirectResponse
    {
        $validated = $request->validate([
            'rejection_reason' => ['required', 'string', 'max:1000'],
        ]);

        $internshipPosting->update([
            'status' => 'rejected',
            'rejection_reason' => $validated['rejection_reason'],
        ]);

        Notification::send(
            $internshipPosting->companyProfile->user_id,
            'posting_rejected',
            'Internship Posting Rejected',
            "Your posting \"{$internshipPosting->title}\" was rejected. Reason: {$validated['rejection_reason']}"
        );

        AuditLog::record('posting.rejected', $internshipPosting);

        return back()->with('success', 'Posting rejected.');
    }
}
