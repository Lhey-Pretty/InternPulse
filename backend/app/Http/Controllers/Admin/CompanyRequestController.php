<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\CompanyProfile;
use App\Models\CompanyRequest;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\View\View;

class CompanyRequestController extends Controller
{
    public function index(): View
    {
        $requests = CompanyRequest::with('student')->latest()->paginate(10)->withQueryString();

        return view('admin.company-requests.index', compact('requests'));
    }

    public function approve(Request $request, CompanyRequest $companyRequest): RedirectResponse
    {
        abort_if($companyRequest->status !== 'pending', 422, 'This request has already been reviewed.');
        abort_if(! $companyRequest->contact_email, 422, 'A company contact email is required before approval.');
        abort_if(User::where('email', $companyRequest->contact_email)->exists(), 422, 'This contact email already belongs to an account.');

        $temporaryPassword = Str::password(16);
        $companyUser = null;

        DB::transaction(function () use ($request, $companyRequest, $temporaryPassword, &$companyUser): void {
            $companyUser = User::create([
                'name' => $companyRequest->company_name,
                'email' => $companyRequest->contact_email,
                'password' => Hash::make($temporaryPassword),
                'password_changed_at' => now(),
                'role' => 'company',
                'is_active' => true,
                'must_change_password' => true,
                'email_verified_at' => now(),
            ]);

            CompanyProfile::create([
                'user_id' => $companyUser->id,
                'company_name' => $companyRequest->company_name,
                'website' => $companyRequest->website,
                'contact_email' => $companyRequest->contact_email,
                'verification_status' => 'verified',
                'verified_at' => now(),
                'verified_by' => $request->user()->id,
            ]);

            $companyRequest->update([
                'status' => 'approved',
                'reviewed_by' => $request->user()->id,
                'reviewed_at' => now(),
            ]);
            AuditLog::record('admin.company_request.approved', $companyRequest, ['company_user_id' => $companyUser->id]);
        });

        return redirect()->route('admin.company-requests.index')
            ->with('success', "Company approved. Login: {$companyUser->email} | Temporary password: {$temporaryPassword}. Require the company to change it on first login.");
    }

    public function reject(Request $request, CompanyRequest $companyRequest): RedirectResponse
    {
        abort_if($companyRequest->status !== 'pending', 422, 'This request has already been reviewed.');

        $validated = $request->validate(['review_notes' => ['required', 'string', 'max:2000']]);
        $companyRequest->update([
            'status' => 'rejected',
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
            'review_notes' => $validated['review_notes'],
        ]);
        AuditLog::record('admin.company_request.rejected', $companyRequest, $validated);

        return back()->with('success', 'Company request rejected.');
    }
}
