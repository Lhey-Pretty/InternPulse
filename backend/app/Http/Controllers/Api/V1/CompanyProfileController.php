<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\CompanyProfile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CompanyProfileController extends ApiController
{
    /**
     * Display a listing of verified partner companies.
     */
    public function index(): JsonResponse
    {
        $companies = CompanyProfile::withCount(['internshipPostings' => function ($q): void {
            $q->where('status', 'approved');
        }])
            ->where('verification_status', 'verified')
            ->latest()
            ->paginate($this->perPage(request()));

        return $this->ok('Companies retrieved successfully.', $companies);
    }

    /**
     * Display the specified company profile.
     */
    public function show(Request $request): JsonResponse
    {
        $company = $request->user()->companyProfile?->load(['internshipPostings' => function ($q): void {
            $q->where('status', 'approved');
        }]);

        if (! $company) {
            return $this->error('Company not found.', 404);
        }

        return $this->ok('Company profile retrieved successfully.', $company);
    }

    public function update(Request $request): JsonResponse
    {
        $company = $request->user()->companyProfile;
        if (! $company) {
            return $this->error('Company profile not found.', 404);
        }

        $company->update($request->validate([
            'company_name' => ['required', 'string', 'max:255'],
            'industry' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'address' => ['nullable', 'string'],
            'city' => ['nullable', 'string', 'max:255'],
            'province' => ['nullable', 'string', 'max:255'],
            'website' => ['nullable', 'url', 'max:255'],
            'contact_person' => ['nullable', 'string', 'max:255'],
            'contact_phone' => ['nullable', 'string', 'max:255'],
            'contact_email' => ['nullable', 'email', 'max:255'],
            'facebook_page' => ['nullable', 'url', 'max:255'],
            'logo' => ['nullable', 'image', 'max:2048'],
        ]));

        if ($request->hasFile('logo')) {
            $company->update(['logo_path' => $request->file('logo')->store('company-logos', 'public')]);
        }

        return $this->ok('Company profile saved successfully.', $company->fresh());
    }
}
