<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\StudentProfile;
use Illuminate\Http\JsonResponse;

class StudentProfileController extends Controller
{
    /**
     * Display a listing of students.
     */
    public function index(): JsonResponse
    {
        $students = StudentProfile::with('skills')
            ->latest()
            ->paginate(15);

        return $this->ok('Students retrieved successfully.', $students);
    }

    /**
     * Display the specified student profile.
     */
    public function show(int $id): JsonResponse
    {
        $student = StudentProfile::with(['skills', 'applications.internshipPosting', 'placements'])
            ->find($id);

        if (! $student) {
            return $this->error('Student profile not found.', 404);
        }

        return $this->ok('Student profile retrieved successfully.', $student);
    }
}
