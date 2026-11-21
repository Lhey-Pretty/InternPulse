<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Illuminate\View\View;

class UserController extends Controller
{
    public function index(Request $request): View
    {
        $query = User::with(['studentProfile', 'companyProfile', 'coordinatorProfile']);

        if ($search = $request->input('search')) {
            $query->where(fn ($q) => $q->where('name', 'like', "%{$search}%")
                ->orWhere('email', 'like', "%{$search}%"));
        }

        if ($role = $request->input('role')) {
            $query->where('role', $role);
        }

        if ($request->input('inactive_only')) {
            $query->where('is_active', false);
        }

        // If a specific user is highlighted (from dashboard Manage link),
        // sort them to the top of the first page so they're immediately visible.
        $highlightId = $request->input('highlight');
        if ($highlightId) {
            $query->orderByRaw('CASE WHEN id = ? THEN 0 ELSE 1 END', [$highlightId]);
        }

        $query->latest();

        $users = $query->paginate(10)->withQueryString();

        return view('admin.users.index', compact('users', 'highlightId'));
    }

    public function create(): View
    {
        return view('admin.users.create');
    }

    public function edit(User $user): View
    {
        return view('admin.users.edit', compact('user'));
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'unique:users,email,' . $user->id],
            'password' => ['nullable', Password::defaults()],
            'role' => ['required', 'in:student,company,coordinator,admin'],
            'is_active' => ['required', 'boolean'],
        ]);

        $data = [
            'name' => $validated['name'],
            'email' => $validated['email'],
            'role' => $validated['role'],
            'is_active' => (bool) $validated['is_active'],
        ];

        if (!empty($validated['password'])) {
            $data['password'] = Hash::make($validated['password']);
        }

        $user->update($data);

        AuditLog::record('user.updated', $user, [
            'role' => $validated['role'],
            'is_active' => $user->is_active,
        ]);

        return redirect()->route('admin.users.index')
            ->with('success', "User \"{$user->name}\" updated successfully.");
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'unique:users'],
            'password' => ['required', Password::defaults()],
            'role' => ['required', 'in:student,company,coordinator,admin'],
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'password_changed_at' => now(),
            'role' => $validated['role'],
            'is_active' => true,
            'email_verified_at' => now(),
        ]);

        AuditLog::record('user.created', $user, ['role' => $validated['role']]);

        return redirect()->route('admin.users.index')
            ->with('success', 'User created successfully.');
    }

    public function toggleActive(Request $request, User $user): RedirectResponse
    {
        abort_if($user->id === $request->user()->id, 403, 'You cannot deactivate your own account.');

        $wasInactive = !$user->is_active;
        $user->update(['is_active' => ! $user->is_active]);

        $action = $user->is_active ? 'activated' : 'deactivated';
        AuditLog::record("user.{$action}", $user);

        // Send email notification if account was just activated
        if ($wasInactive && $user->is_active) {
            try {
                if ($user->role === 'student') {
                    \Mail::to($user->email)->send(new \App\Mail\StudentAccountApproved($user->name));
                } elseif ($user->role === 'company') {
                    \Mail::to($user->email)->send(new \App\Mail\CompanyAccountApproved($user->name, $user->companyProfile?->company_name ?? 'your company'));
                }
            } catch (\Throwable $exception) {
                report($exception);
            }
        }

        return back()->with('success', "User {$action} successfully.");
    }

    public function destroy(Request $request, User $user): RedirectResponse
    {
        abort_if($user->id === $request->user()->id, 403, 'You cannot delete your own account.');

        AuditLog::record('user.deleted', null, ['user_id' => $user->id, 'email' => $user->email]);

        $user->delete();

        return redirect()->route('admin.users.index')
            ->with('success', 'User deleted.');
    }

    public function exportCsv(): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        return response()->streamDownload(function () {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['ID', 'Name', 'Email', 'Role', 'Status', 'Registered Date']);

            User::chunk(200, function ($users) use ($handle) {
                foreach ($users as $user) {
                    fputcsv($handle, [
                        $user->id,
                        $user->name,
                        $user->email,
                        ucfirst($user->role),
                        $user->is_active ? 'Active' : 'Inactive',
                        $user->created_at->format('Y-m-d H:i:s'),
                    ]);
                }
            });

            fclose($handle);
        }, 'users-' . now()->format('Y-m-d') . '.csv', [
            'Content-Type' => 'text/csv',
        ]);
    }
}
