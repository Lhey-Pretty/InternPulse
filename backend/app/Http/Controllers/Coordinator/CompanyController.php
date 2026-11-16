<?php

namespace App\Http\Controllers\Coordinator;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\CompanyProfile;
use App\Models\Notification;
use App\Services\JournalClassificationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

class CompanyController extends Controller
{
    public function index(Request $request): View
    {
        $query = CompanyProfile::with('user');

        if ($search = $request->input('search')) {
            $query->where('company_name', 'like', "%{$search}%");
        }

        if ($status = $request->input('status')) {
            $query->where('verification_status', $status);
        }

        $companies = $query->paginate(10)->withQueryString();

        return view('coordinator.companies.index', compact('companies'));
    }

    public function show(CompanyProfile $companyProfile): View
    {
        $companyProfile->load(['user', 'internshipPostings']);

        // Get journal classification statistics for this company
        $journalStats = JournalClassificationService::getCompanyStatistics($companyProfile->id);

        return view('coordinator.companies.show', compact('companyProfile', 'journalStats'));
    }

    public function verify(Request $request, CompanyProfile $companyProfile): RedirectResponse
    {
        $companyProfile->update([
            'verification_status' => 'verified',
            'verified_at' => now(),
            'verified_by' => $request->user()->id,
            'rejection_reason' => null,
        ]);

        Notification::send(
            $companyProfile->user_id,
            'company_verified',
            'Company Account Verified',
            'Your company account has been verified. You can now post internship opportunities.'
        );

        AuditLog::record('company.verified', $companyProfile);

        return back()->with('success', 'Company verified successfully.');
    }

    public function reject(Request $request, CompanyProfile $companyProfile): RedirectResponse
    {
        $validated = $request->validate([
            'rejection_reason' => ['required', 'string', 'max:1000'],
        ]);

        $companyProfile->update([
            'verification_status' => 'rejected',
            'rejection_reason' => $validated['rejection_reason'],
        ]);

        Notification::send(
            $companyProfile->user_id,
            'company_rejected',
            'Company Verification Rejected',
            "Your company account verification was rejected. Reason: {$validated['rejection_reason']}"
        );

        AuditLog::record('company.rejected', $companyProfile);

        return back()->with('success', 'Company registration rejected.');
    }
}
