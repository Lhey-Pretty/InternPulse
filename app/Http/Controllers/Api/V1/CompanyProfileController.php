<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\CompanyProfile;
use Illuminate\Http\JsonResponse;

class CompanyProfileController extends Controller
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
            ->paginate(15);

        return $this->ok('Companies retrieved successfully.', $companies);
    }

    /**
     * Display the specified company profile.
     */
    public function show(int $id): JsonResponse
    {
        $company = CompanyProfile::with(['internshipPostings' => function ($q): void {
            $q->where('status', 'approved');
        }])->find($id);

        if (! $company) {
            return $this->error('Company not found.', 404);
        }

        return $this->ok('Company profile retrieved successfully.', $company);
    }
}
