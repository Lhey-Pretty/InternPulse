<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\CompanyRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

class CompanyRequestController extends Controller
{
    public function index(Request $request): View
    {
        $requests = CompanyRequest::where('student_user_id', $request->user()->id)
            ->latest()
            ->get();

        return view('student.company-requests.index', compact('requests'));
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'company_name' => ['required', 'string', 'max:255'],
            'contact_email' => ['nullable', 'email', 'max:255'],
            'website' => ['nullable', 'url', 'max:255'],
            'reason' => ['nullable', 'string', 'max:2000'],
        ]);

        CompanyRequest::create([
            ...$validated,
            'student_user_id' => $request->user()->id,
        ]);
        AuditLog::record('student.company_request.created', null, ['company_name' => $validated['company_name']]);

        return back()->with('success', 'Company request submitted for campus review.');
    }
}
