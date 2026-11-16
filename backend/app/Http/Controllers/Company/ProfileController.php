<?php

namespace App\Http\Controllers\Company;

use App\Http\Controllers\Controller;
use App\Models\CompanyProfile;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

class ProfileController extends Controller
{
    public function edit(Request $request): View
    {
        $company = $request->user()->companyProfile ?? new CompanyProfile;

        return view('company.profile.edit', compact('company'));
    }

    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'company_name' => ['required', 'string', 'max:200'],
            'industry' => ['required', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:3000'],
            'address' => ['required', 'string', 'max:500'],
            'city' => ['required', 'string', 'max:100'],
            'province' => ['required', 'string', 'max:100'],
            'website' => ['required', 'url', 'max:200'],
            'facebook_page' => ['nullable', 'url', 'max:200'],
            'contact_person' => ['nullable', 'string', 'max:100'],
            'contact_phone' => ['nullable', 'string', 'max:20'],
            'contact_email' => ['nullable', 'email', 'max:200'],
            'logo' => ['nullable', 'image', 'max:2048'],
        ]);

        $user = $request->user();
        $profileData = collect($validated)->except(['logo'])->toArray();

        if ($user->companyProfile) {
            $user->companyProfile->update($profileData);
            $company = $user->companyProfile;
        } else {
            $company = CompanyProfile::create(array_merge($profileData, [
                'user_id' => $user->id,
                'verification_status' => 'pending',
            ]));
        }

        if ($request->hasFile('logo')) {
            $path = $request->file('logo')->store('company-logos', 'public');
            $company->update(['logo_path' => $path]);
        }

        return redirect()->route('company.profile.edit')
            ->with('success', 'Company profile updated successfully.');
    }
}
