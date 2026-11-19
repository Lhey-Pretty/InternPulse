<?php

namespace App\Http\Controllers\Coordinator;

use App\Http\Controllers\Controller;
use App\Models\InternshipPlacement;
use Illuminate\Http\Request;
use Illuminate\View\View;

class PlacementController extends Controller
{
    public function index(Request $request): View
    {
        $query = InternshipPlacement::with(['studentProfile', 'internshipPosting.companyProfile']);

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        if ($search = $request->input('search')) {
            $query->whereHas('studentProfile', fn ($q) => $q->where('first_name', 'like', "%{$search}%")
                ->orWhere('last_name', 'like', "%{$search}%"));
        }

        $placements = $query->latest()->paginate(10)->withQueryString();

        return view('coordinator.placements.index', compact('placements'));
    }

    public function show(InternshipPlacement $placement): View
    {
        $placement->load([
            'studentProfile.skills',
            'internshipPosting.companyProfile',
            'attendanceLogs',
            'tasks',
            'evaluations',
        ]);

        return view('coordinator.placements.show', compact('placement'));
    }
}
