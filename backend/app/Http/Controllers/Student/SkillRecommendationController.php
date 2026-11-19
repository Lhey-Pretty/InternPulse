<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Models\InternshipPosting;
use App\Models\Skill;
use Illuminate\Http\Request;
use Illuminate\View\View;

class SkillRecommendationController extends Controller
{
    public function index(Request $request): View
    {
        $student = $request->user()->studentProfile;

        $studentSkillNames = $student
            ? $student->skills
                ->pluck('name')
                ->map(fn ($name) => strtolower(trim($name)))
                ->filter()
                ->unique()
                ->values()
                ->toArray()
            : [];

        // Identify the three most frequently requested skills missing from the student's profile.
        $skillGaps = collect();
        $suggestedSkills = collect();
        $suggestedSkillsPaginator = null;

        if ($student) {
            $program = strtoupper(trim((string) ($student->program ?: $student->course)));

            // Collect required skills only from postings for the student's program.
            $requiredSkillsByPosting = InternshipPosting::where('status', 'approved')
                ->whereNotNull('required_course')
                ->where(function ($query) use ($program) {
                    $query->whereRaw('UPPER(required_course) = ?', [$program])
                        ->orWhereRaw('UPPER(required_course) LIKE ?', ["%{$program}%"]);
                })
                ->whereNotNull('required_skills')
                ->pluck('required_skills')
                ->map(fn ($skills) => collect($skills)
                    ->map(fn ($skill) => trim((string) $skill))
                    ->filter()
                    ->unique(fn ($skill) => strtolower($skill))
                    ->values());

            $skillGaps = $requiredSkillsByPosting
                ->flatten()
                ->groupBy(fn ($skill) => strtolower($skill))
                ->reject(fn ($skills, $normalizedSkill) => in_array($normalizedSkill, $studentSkillNames, true))
                ->map(fn ($skills) => [
                    'name' => $skills->first(),
                    'count' => $skills->count(),
                ])
                ->sortByDesc('count')
                ->take(3)
                ->values();

            // Suggested skills from the skills table not yet in student's profile
            $skillSearch = trim((string) $request->input('search'));
            $suggestedSkillsQuery = Skill::where('category', $program)
                ->whereNotIn('name', $student->skills->pluck('name'));

            if ($skillSearch !== '') {
                $suggestedSkillsQuery->where('name', 'like', "%{$skillSearch}%");
            }

            $suggestedSkillsPaginator = $suggestedSkillsQuery
                ->orderBy('category')
                ->orderBy('name')
                ->paginate(10)
                ->withQueryString();

            $suggestedSkills = collect($suggestedSkillsPaginator->items())
                ->groupBy('category');
        }

        return view('student.skill-recommendation.index', compact(
            'student',
            'skillGaps',
            'suggestedSkills',
            'studentSkillNames',
            'suggestedSkillsPaginator',
        ));
    }
}
