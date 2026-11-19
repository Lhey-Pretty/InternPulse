<?php

namespace App\Http\Controllers\Coordinator;

use App\Http\Controllers\Controller;
use App\Models\CoordinatorProfile;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

class ProfileController extends Controller
{
    public function edit(Request $request): View
    {
        $coordinator = $request->user()->coordinatorProfile ?? new CoordinatorProfile;

        return view('coordinator.profile.edit', compact('coordinator'));
    }

    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'middle_name' => ['nullable', 'string', 'max:100'],
            'employee_id' => ['nullable', 'string', 'max:50'],
            'department' => ['nullable', 'string', 'max:200'],
            'phone_number' => ['nullable', 'string', 'max:20'],
        ]);

        $user = $request->user();

        if ($user->coordinatorProfile) {
            $user->coordinatorProfile->update($validated);
        } else {
            CoordinatorProfile::create(array_merge($validated, ['user_id' => $user->id]));
        }

        return redirect()->route('coordinator.profile.edit')
            ->with('success', 'Profile updated successfully.');
    }
}
