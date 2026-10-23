<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Application;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ApplicationController extends Controller
{
    /**
     * Display a listing of applications.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = Application::with(['studentProfile', 'internshipPosting.companyProfile']);

        if ($user && $user->isStudent() && $user->studentProfile) {
            $query->where('student_profile_id', $user->studentProfile->id);
        } elseif ($user && $user->isCompany() && $user->companyProfile) {
            $query->whereHas('internshipPosting', function ($q) use ($user): void {
                $q->where('company_profile_id', $user->companyProfile->id);
            });
        }

        $applications = $query->latest('applied_at')->paginate(15);

        return $this->ok('Applications retrieved successfully.', $applications);
    }

    /**
     * Display the specified application.
     */
    public function show(int $id): JsonResponse
    {
        $application = Application::with(['studentProfile', 'internshipPosting.companyProfile', 'placement'])
            ->find($id);

        if (! $application) {
            return $this->error('Application not found.', 404);
        }

        return $this->ok('Application retrieved successfully.', $application);
    }
}
