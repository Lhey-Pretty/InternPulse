<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\V1\ApiController;
use App\Models\InternshipPlacement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InternshipPlacementController extends ApiController
{
    /**
     * Display a listing of internship placements.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = InternshipPlacement::with(['studentProfile', 'internshipPosting.companyProfile']);

        if ($user && $user->isStudent() && $user->studentProfile) {
            $query->where('student_profile_id', $user->studentProfile->id);
        } elseif ($user && $user->isCompany() && $user->companyProfile) {
            $query->whereHas('internshipPosting', function ($q) use ($user): void {
                $q->where('company_profile_id', $user->companyProfile->id);
            });
        } elseif (! $user || ! $user->isCoordinator() && ! $user->isAdmin()) {
            abort(403, 'You are not authorized to view placements.');
        }

        $placements = $query->latest('start_date')->paginate(10);

        return $this->ok('Placements retrieved successfully.', $placements);
    }

    /**
     * Display the specified placement.
     */
    public function show(int $id): JsonResponse
    {
        $placement = InternshipPlacement::with([
            'studentProfile',
            'internshipPosting.companyProfile',
            'attendanceLogs',
            'tasks',
        ])->find($id);

        if (! $placement) {
            return $this->error('Placement not found.', 404);
        }

        $user = request()->user();
        $isOwnerStudent = $user?->isStudent()
            && $user->studentProfile?->id === $placement->student_profile_id;
        $isOwnerCompany = $user?->isCompany()
            && $user->companyProfile?->id === $placement->internshipPosting?->company_profile_id;
        abort_unless($user && ($user->isAdmin() || $user->isCoordinator() || $isOwnerStudent || $isOwnerCompany), 403);

        return $this->ok('Placement retrieved successfully.', $placement);
    }
}
