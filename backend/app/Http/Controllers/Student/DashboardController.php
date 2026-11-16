<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\View\View;

class DashboardController extends Controller
{
    public function index(Request $request): View
    {
        $user = $request->user();
        $student = $user->studentProfile;

        $activePlacement = null;
        $recentApplications = collect();
        $pendingTasks = collect();
        $unreadNotifications = collect();

        if ($student) {
            $activePlacement = $student->placements()
                ->with(['internshipPosting.companyProfile'])
                ->where('status', 'active')
                ->latest()
                ->first();

            $recentApplications = $student->applications()
                ->with(['internshipPosting.companyProfile'])
                ->latest()
                ->take(5)
                ->get();

            if ($activePlacement) {
                $pendingTasks = $activePlacement->tasks()
                    ->whereIn('status', ['pending', 'in_progress'])
                    ->orderBy('due_date')
                    ->take(5)
                    ->get();
            }
        }

        $unreadNotifications = $user->notifications()
            ->where('is_read', false)
            ->latest()
            ->take(5)
            ->get();

        return view('student.dashboard', compact(
            'student',
            'activePlacement',
            'recentApplications',
            'pendingTasks',
            'unreadNotifications',
        ));
    }
}
