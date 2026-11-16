<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\SessionLog;
use Illuminate\Http\Request;
use Illuminate\View\View;

class SessionLogController extends Controller
{
    public function index(Request $request): View
    {
        $query = SessionLog::with('user')->latest();

        if ($search = $request->input('search')) {
            $query->where(function ($builder) use ($search) {
                $builder->where('email', 'like', "%{$search}%");
            });
        }

        if ($event = $request->input('event')) {
            $query->where('event', $event);
        }

        $logs = $query->paginate(10)->withQueryString();
        $activeCount = SessionLog::where('event', 'login')
            ->whereNull('logged_out_at')
            ->where('created_at', '>=', now()->subMinutes(30))
            ->distinct('user_id')
            ->count('user_id');

        return view('admin.session-logs.index', compact('logs', 'activeCount'));
    }
}
