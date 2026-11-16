<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Models\Skill;
use App\Models\StudentProfile;
use App\Support\AcademicSections;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

class ProfileController extends Controller
{
    /**
     * Official OJT Degree Programs.
     * Skills shown to a student are filtered to match their selected program only.
     */
    protected array $programs = [
        'BSIT'         => 'BS in Information Technology',
        'BSCPE'        => 'BS in Computer Engineering',
        'BSHM'         => 'BS in Hospitality Management',
        'BSTM'         => 'BS in Tourism Management',
        'BSCRIM'       => 'BS in Criminology',
        'FISHERIES'    => 'BS in Fisheries',
        'POLSCI'       => 'BA in Political Science',
        'BEED'         => 'Bachelor of Elementary Education',
        'BSED_MATH'    => 'BSED - Major in Mathematics',
        'BSED_SCIENCE' => 'BSED - Major in Science',
        'BSED_ENGLISH' => 'BSED - Major in English',
    ];

    public function edit(Request $request): View
    {
        $user = $request->user();
        $student = $user->studentProfile ?? new StudentProfile;

        // Determine current course code — prefer 'program' column (always a clean key),
        // fall back to 'course' column for legacy data. Empty string if not yet chosen.
        $rawCourse      = $student->program ?? $student->course ?? '';
        $currentCourseCode = '';

        foreach (array_keys($this->programs) as $code) {
            if (
                strcasecmp($rawCourse, $code) === 0 ||
                stripos($rawCourse, $code) !== false ||
                stripos($this->programs[$code], $rawCourse) !== false
            ) {
                $currentCourseCode = $code;
                break;
            }
        }

        // Fetch skills for the student's program only — other program skills stay in DB
        // but are not shown here (dynamic: if program changes, skills filter auto-updates)
        $allSkills = Skill::select('id', 'name', 'category')
            ->where('category', $currentCourseCode)
            ->orderBy('name')
            ->get();
        $skillsByCategory = $allSkills->groupBy('category');
        $studentSkillIds = $student->exists 
            ? $student->skills->pluck('id')->map(fn ($id) => (int) $id)->toArray() 
            : [];

        return view('student.profile.edit', [
            'student' => $student,
            'programs' => $this->programs,
            'currentCourseCode' => $currentCourseCode,
            'skillsByCategory' => $skillsByCategory,
            'studentSkillIds' => $studentSkillIds,
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'middle_name' => ['nullable', 'string', 'max:100'],
            'gender' => ['nullable', 'in:male,female,other'],
            'birth_date' => ['nullable', 'date', 'before:today'],
            'phone_number' => ['nullable', 'string', 'max:20'],
            'address' => ['nullable', 'string', 'max:500'],
            'course' => ['required', 'string', 'max:100'],
            'year_level' => ['nullable', 'string', 'max:20'],
            'section' => ['nullable', 'string', \Illuminate\Validation\Rule::in(AcademicSections::SECTIONS)],
            'school_name' => ['nullable', 'string', 'max:200'],
            'school_address' => ['nullable', 'string', 'max:300'],
            'required_hours' => ['nullable', 'integer', 'min:1'],
            'bio' => ['nullable', 'string', 'max:1000'],
            'career_interests' => ['nullable', 'string', 'max:500'],
            'student_id_number' => ['nullable', 'string', 'max:50'],
            'skills' => ['nullable', 'array'],
            'skills.*' => ['exists:skills,id'],
            'resume' => ['nullable', 'file', 'mimes:pdf,doc,docx', 'max:5120'],
            'profile_photo' => ['nullable', 'image', 'mimes:jpg,jpeg,png', 'max:2048'],
        ]);

        $user = $request->user();

        $profileData = collect($validated)->except(['skills', 'resume', 'profile_photo', 'required_hours'])->toArray();

        // Normalize course to uppercase code and sync program column
        $courseKey = strtoupper(trim($validated['course']));
        if (array_key_exists($courseKey, $this->programs)) {
            $profileData['course']   = $courseKey;  // overwrite with clean code
            $profileData['program']  = $courseKey;  // keep program in sync
        }

        $student = $user->studentProfile
            ? tap($user->studentProfile)->update($profileData)
            : StudentProfile::create(array_merge($profileData, ['user_id' => $user->id]));

        if ($request->hasFile('resume')) {
            $path = $request->file('resume')->store('resumes', 'public');
            $student->update(['resume_path' => $path]);
        }

        if ($request->hasFile('profile_photo')) {
            $photoPath = $request->file('profile_photo')->store('profile-photos', 'public');
            $student->update(['profile_photo_path' => $photoPath]);
        }

        // Sync the skills selected by the student.
        if (isset($validated['skills'])) {
            $student->skills()->sync($validated['skills']);
        } else {
            $student->skills()->sync([]);
        }

        return redirect()->route('student.profile.edit')
            ->with('success', 'Profile and skills updated successfully.');
    }

    public function show(Request $request): View
    {
        $student = $request->user()->studentProfile()->with('skills')->firstOrFail();

        return view('student.profile.show', [
            'student'       => $student,
            'validPrograms' => array_keys($this->programs),
        ]);
    }
}
