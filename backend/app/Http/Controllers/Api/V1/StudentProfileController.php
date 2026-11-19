<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\StudentProfile;
use App\Support\AcademicPrograms;
use App\Support\AcademicSections;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class StudentProfileController extends ApiController
{
    /**
     * Display a listing of students.
     */
    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()?->isAdmin() || $request->user()?->isCoordinator(), 403);

        $students = StudentProfile::with('skills')
            ->latest()
            ->paginate($this->perPage(request()));

        return $this->ok('Students retrieved successfully.', $students);
    }

    /**
     * Display the specified student profile.
     */
    public function show(Request $request): JsonResponse
    {
        $student = $request->user()->studentProfile?->load([
            'skills',
            'applications.internshipPosting',
            'placements.internshipPosting.companyProfile',
        ]);

        if (! $student) {
            return $this->error('Student profile not found.', 404);
        }

        return $this->ok('Student profile retrieved successfully.', $student);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'student_id_number' => ['nullable', 'string', 'max:255'],
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'middle_name' => ['nullable', 'string', 'max:255'],
            'phone_number' => ['nullable', 'string', 'max:255'],
            'address' => ['nullable', 'string'],
            'course' => ['required', 'string', Rule::in(array_keys(AcademicPrograms::PROGRAMS))],
            'program' => ['nullable', 'string', Rule::in(array_keys(AcademicPrograms::PROGRAMS))],
            'year_level' => ['nullable', 'string', 'max:255'],
            'section' => ['nullable', 'string', Rule::in(AcademicSections::SECTIONS)],
            'bio' => ['nullable', 'string'],
            'career_interests' => ['nullable', 'string'],
        ]);

        $profile = $request->user()->studentProfile;
        if (! $profile) {
            $profile = StudentProfile::create(['user_id' => $request->user()->id, ...$validated]);
        } else {
            $profile->update($validated);
        }

        return $this->ok('Student profile saved successfully.', $profile->fresh());
    }
}
