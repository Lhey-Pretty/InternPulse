<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\CompanyProfile;
use App\Models\InternshipPlacement;
use App\Models\User;
use Illuminate\View\View;

class DashboardController extends Controller
{
    public function index(): View
    {
        $stats = [
            'total_users' => User::count(),
            'total_students' => User::where('role', 'student')->count(),
            'total_companies' => User::where('role', 'company')->count(),
            'total_coordinators' => User::where('role', 'coordinator')->count(),
            'inactive_users' => User::where('is_active', false)->count(),
            'pending_companies' => CompanyProfile::where('verification_status', 'pending')->count(),
            'active_placements' => InternshipPlacement::where('status', 'active')->count(),
            'completed_placements' => InternshipPlacement::where('status', 'completed')->count(),
        ];

        return view('admin.dashboard', compact('stats'));
    }
}
