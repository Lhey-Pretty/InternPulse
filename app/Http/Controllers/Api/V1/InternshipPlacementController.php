<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\InternshipPlacement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InternshipPlacementController extends Controller
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
        }

        $placements = $query->latest('start_date')->paginate(15);

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

        return $this->ok('Placement retrieved successfully.', $placement);
    }
}
