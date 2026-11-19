<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\CompanyProfile;
use App\Models\Evaluation;
use App\Models\InternshipPlacement;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\View\View;

class ReportController extends Controller
{
    public function index(Request $request): View
    {
        $stats = [
            'users' => [
                'total' => User::count(),
                'students' => User::where('role', 'student')->count(),
                'companies' => User::where('role', 'company')->count(),
                'coordinators' => User::where('role', 'coordinator')->count(),
            ],
            'placements' => [
                'active' => InternshipPlacement::where('status', 'active')->count(),
                'completed' => InternshipPlacement::where('status', 'completed')->count(),
                'terminated' => InternshipPlacement::where('status', 'terminated')->count(),
            ],
            'companies' => [
                'verified' => CompanyProfile::where('verification_status', 'verified')->count(),
                'pending' => CompanyProfile::where('verification_status', 'pending')->count(),
            ],
            'average_evaluation' => round((float) Evaluation::avg('overall_rating'), 2),
        ];

        $monthlyPlacements = InternshipPlacement::selectRaw('MONTH(created_at) as month, COUNT(*) as total')
            ->whereYear('created_at', now()->year)
            ->whereBetween(\Illuminate\Support\Facades\DB::raw('MONTH(created_at)'), [1, 5])
            ->groupBy('month')
            ->orderBy('month')
            ->pluck('total', 'month');

        return view('admin.reports.index', compact('stats', 'monthlyPlacements'));
    }
}
