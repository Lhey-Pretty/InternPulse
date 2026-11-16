<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\CompanyProfile;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Illuminate\View\View;

class CompanyVerificationController extends Controller
{
    public function index(Request $request): View
    {
        $status = $request->input('status', 'pending');

        $query = CompanyProfile::with('user');

        if ($status !== 'all') {
            $query->where('verification_status', $status);
        }

        $companies = $query->latest()->paginate(10)->withQueryString();

        return view('admin.companies.index', compact('companies', 'status'));
    }

    public function create(): View
    {
        return view('admin.companies.create');
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            // Account credentials
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'unique:users,email'],
            'password' => ['required', Password::min(8)],
            // Temporary access window
            'is_temporary' => ['boolean'],
            'access_starts_at' => ['nullable', 'date'],
            'access_ends_at' => ['nullable', 'date', 'after:access_starts_at'],
            // Company profile
            'company_name' => ['required', 'string', 'max:200'],
            'industry' => ['nullable', 'string', 'max:100'],
            'description' => ['nullable', 'string'],
            'address' => ['required', 'string', 'max:500'],
            'city' => ['nullable', 'string', 'max:100'],
            'province' => ['nullable', 'string', 'max:100'],
            'website' => ['nullable', 'url', 'max:200'],
            'contact_person' => ['nullable', 'string', 'max:100'],
            'contact_phone' => ['nullable', 'string', 'max:20'],
            'contact_email' => ['nullable', 'email', 'max:200'],
        ]);

        // Create the user account
        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'password_changed_at' => now(),
            'role' => 'company',
            'is_active' => true,
            'is_temporary' => $request->boolean('is_temporary'),
            'access_starts_at' => $validated['access_starts_at'] ?? null,
            'access_ends_at' => $validated['access_ends_at'] ?? null,
            'email_verified_at' => now(),
        ]);

        // Create the company profile — auto-verified since admin created it
        CompanyProfile::create([
            'user_id' => $user->id,
            'company_name' => $validated['company_name'],
            'industry' => $validated['industry'] ?? null,
            'description' => $validated['description'] ?? null,
            'address' => $validated['address'],
            'city' => $validated['city'] ?? null,
            'province' => $validated['province'] ?? null,
            'website' => $validated['website'] ?? null,
            'contact_person' => $validated['contact_person'] ?? null,
            'contact_phone' => $validated['contact_phone'] ?? null,
            'contact_email' => $validated['contact_email'] ?? null,
            'verification_status' => 'verified',
            'verified_at' => now(),
            'verified_by' => $request->user()->id,
        ]);

        AuditLog::record('admin.company.created', null, [
            'company_name' => $validated['company_name'],
            'email' => $validated['email'],
            'is_temporary' => $request->boolean('is_temporary'),
        ]);

        return redirect()->route('admin.companies.index')
            ->with('success', "Company \"{$validated['company_name']}\" created successfully.");
    }

    public function show(CompanyProfile $companyProfile): View
    {
        $companyProfile->load(['user', 'internshipPostings', 'ratings']);

        $averageRating = $companyProfile->averageRating();
        $ratingCount = $companyProfile->ratings()->count();

        return view('admin.companies.show', compact('companyProfile', 'averageRating', 'ratingCount'));
    }

    public function edit(CompanyProfile $companyProfile): View
    {
        $companyProfile->load('user');

        return view('admin.companies.edit', compact('companyProfile'));
    }

    public function update(Request $request, CompanyProfile $companyProfile): RedirectResponse
    {
        $validated = $request->validate([
            'company_name' => ['required', 'string', 'max:200'],
            'industry' => ['nullable', 'string', 'max:100'],
            'description' => ['nullable', 'string'],
            'address' => ['required', 'string', 'max:500'],
            'city' => ['nullable', 'string', 'max:100'],
            'province' => ['nullable', 'string', 'max:100'],
            'website' => ['nullable', 'url', 'max:200'],
            'contact_person' => ['nullable', 'string', 'max:100'],
            'contact_phone' => ['nullable', 'string', 'max:20'],
            'contact_email' => ['nullable', 'email', 'max:200'],
            // Temporary access
            'is_temporary' => ['boolean'],
            'access_starts_at' => ['nullable', 'date'],
            'access_ends_at' => ['nullable', 'date', 'after_or_equal:access_starts_at'],
        ]);

        $companyProfile->update(collect($validated)->except(['is_temporary', 'access_starts_at', 'access_ends_at'])->toArray());

        $companyProfile->user->update([
            'is_temporary' => $request->boolean('is_temporary'),
            'access_starts_at' => $validated['access_starts_at'] ?? null,
            'access_ends_at' => $validated['access_ends_at'] ?? null,
        ]);

        AuditLog::record('admin.company.updated', $companyProfile);

        return redirect()->route('admin.companies.show', $companyProfile)
            ->with('success', 'Company updated.');
    }

    public function verify(Request $request, CompanyProfile $companyProfile): RedirectResponse
    {
        $companyProfile->update([
            'verification_status' => 'verified',
            'verified_at' => now(),
            'verified_by' => $request->user()->id,
            'rejection_reason' => null,
        ]);
        $companyProfile->user->update(['is_active' => true]);

        Notification::send(
            $companyProfile->user_id,
            'company_verified',
            'Company Account Verified',
            'Your company account has been verified by the administrator.'
        );

        AuditLog::record('admin.company.verified', $companyProfile);

        return back()->with('success', 'Company verified.');
    }

    public function toggleActive(CompanyProfile $companyProfile): RedirectResponse
    {
        $user = $companyProfile->user;
        $user->update(['is_active' => ! $user->is_active]);

        $action = $user->is_active ? 'activated' : 'deactivated';
        AuditLog::record("admin.company.{$action}", $companyProfile);

        return back()->with('success', "Company {$action} successfully.");
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
        $companyProfile->user->update(['is_active' => false]);

        Notification::send(
            $companyProfile->user_id,
            'company_rejected',
            'Verification Rejected',
            "Your company verification was rejected. Reason: {$validated['rejection_reason']}"
        );

        AuditLog::record('admin.company.rejected', $companyProfile);

        return back()->with('success', 'Company rejected.');
    }
}
