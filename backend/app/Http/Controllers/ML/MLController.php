<?php

namespace App\Http\Controllers\ML;

use App\Http\Controllers\Controller;
use App\Models\CompanyProfile;
use App\Models\Evaluation;
use App\Models\InternshipPlacement;
use App\Models\InternshipPosting;
use App\Models\Skill;
use App\Models\StudentProfile;
use Illuminate\Http\Request;
use Illuminate\View\View;

class MLController extends Controller
{
    /**
     * ML Dashboard — overview of all ML components.
     */
    public function dashboard(): View
    {
        $stats = [
            'unplaced_students' => StudentProfile::whereDoesntHave('placements', fn ($query) => $query->where('status', 'active'))->count(),
            'partner_companies' => CompanyProfile::where('verification_status', 'verified')
                ->whereHas('user', fn ($query) => $query->where('is_active', true))
                ->count(),
            'total_placements' => InternshipPlacement::count(),
            'avg_system_rating' => round((float) Evaluation::whereNotNull('overall_rating')->avg('overall_rating'), 2),
        ];

        $students = StudentProfile::with('skills')
            ->whereDoesntHave('placements', fn ($query) => $query->where('status', 'active'))
            ->take(20)
            ->get();
        $postings = InternshipPosting::with('companyProfile')
            ->where('status', 'approved')
            ->whereHas('companyProfile', function ($query): void {
                $query->where('verification_status', 'verified')
                    ->whereHas('user', fn ($userQuery) => $userQuery->where('is_active', true));
            })
            ->get();
        $recommendations = [];

        foreach ($students as $student) {
            $studentSkills = $student->skills->pluck('name')->map(fn ($name) => strtolower($name))->toArray();
            $posting = $postings->map(function ($posting) use ($student, $studentSkills) {
                $requiredSkills = array_map('strtolower', $posting->required_skills ?? []);
                $matchedSkills = count(array_intersect($requiredSkills, $studentSkills));
                $totalSkills = count($requiredSkills) ?: 1;
                $courseMatch = ! $posting->required_course
                    || stripos($student->course, $posting->required_course) !== false;

                return [
                    'posting' => $posting,
                    'score' => round(($matchedSkills / $totalSkills) * 70 + ($courseMatch ? 30 : 0), 0),
                ];
            })->sortByDesc('score')->first();

            if ($posting) {
                $recommendations[] = [
                    'student' => $student,
                    'posting' => $posting['posting'],
                    'company' => $posting['posting']->companyProfile,
                    'score' => $posting['score'],
                ];
            }
        }

        usort($recommendations, fn ($left, $right) => $right['score'] <=> $left['score']);
        $recommendations = array_slice($recommendations, 0, 5);

        $companyPerformance = InternshipPlacement::with(['internshipPosting.companyProfile', 'evaluations'])
            ->get()
            ->groupBy(fn ($placement) => $placement->internshipPosting?->company_profile_id)
            ->map(function ($placements) {
                $company = $placements->first()->internshipPosting?->companyProfile;
                $ratings = $placements->flatMap->evaluations->whereNotNull('overall_rating');

                if (! $company || $ratings->isEmpty()) {
                    return null;
                }

                $company->intern_count = $ratings->count();
                $company->avg_eval_rating = round((float) $ratings->avg('overall_rating'), 2);

                return $company;
            })
            ->filter()
            ->sortByDesc('avg_eval_rating')
            ->take(5)
            ->values();

        return view('admin.ml.dashboard', compact('stats', 'recommendations', 'companyPerformance'));
    }

    private function buildSkillGaps()
    {
        $studentSkills = StudentProfile::with('skills')
            ->get()
            ->flatMap(fn ($student) => $student->skills->pluck('name')->map(fn ($name) => strtolower($name)))
            ->countBy();
        $requiredSkills = InternshipPosting::where('status', 'approved')
            ->whereNotNull('required_skills')
            ->pluck('required_skills')
            ->flatten()
            ->map(fn ($skill) => strtolower($skill))
            ->countBy();

        return $requiredSkills->map(function ($demand, $skill) use ($studentSkills) {
            $supply = $studentSkills->get($skill, 0);

            return ['skill' => $skill, 'demand' => $demand, 'supply' => $supply, 'gap' => max(0, $demand - $supply)];
        })->sortByDesc('gap')->take(8)->values();
    }

    /**
     * Generate Placement Recommendations — shows best student-posting pairs.
     */
    public function placementRecommendations(Request $request): View
    {
        // Get unplaced students
        $students = StudentProfile::with('skills')
            ->whereDoesntHave('placements', fn ($q) => $q->where('status', 'active'))
            ->get();

        $postings = InternshipPosting::with('companyProfile')
            ->where('status', 'approved')
            ->get();

        // Compute scores for each student-posting pair
        $recommendations = [];
        foreach ($students as $student) {
            $studentSkills = $student->skills->pluck('name')->map(fn ($n) => strtolower($n))->toArray();

            $topPosting = null;
            $topScore = 0;

            foreach ($postings as $posting) {
                $required = array_map('strtolower', $posting->required_skills ?? []);
                $matched = count(array_intersect($required, $studentSkills));
                $total = count($required) ?: 1;
                $courseMatch = ! $posting->required_course
                    || stripos($student->course, $posting->required_course) !== false;

                $score = round(($matched / $total) * 70 + ($courseMatch ? 30 : 0), 0);

                if ($score > $topScore) {
                    $topScore = $score;
                    $topPosting = $posting;
                }
            }

            if ($topPosting && $topScore > 0) {
                $recommendations[] = [
                    'student' => $student,
                    'posting' => $topPosting,
                    'score' => $topScore,
                ];
            }
        }

        // Sort by score descending
        usort($recommendations, fn ($a, $b) => $b['score'] <=> $a['score']);

        return view('ml.placement-recommendations', compact('recommendations'));
    }

    /**
     * Predict Student Performance based on existing evaluation data.
     */
    public function predictPerformance(): View
    {
        $placements = InternshipPlacement::with([
            'studentProfile',
            'internshipPosting.companyProfile',
            'evaluations',
            'attendanceLogs',
            'weeklyLogs',
        ])
            ->where('status', 'active')
            ->get()
            ->map(function ($placement) {
                $attendance = $placement->attendanceLogs->count();
                $tasks = $placement->tasks;
                $completedTasks = $tasks->where('status', 'completed')->count();
                $totalTasks = $tasks->count() ?: 1;
                $weeklyLogs = $placement->weeklyLogs->where('status', 'submitted')->count();
                $midtermEval = $placement->evaluations->where('evaluation_period', 'midterm')->first();

                // Simple performance prediction score (0–100)
                $attendanceScore = min(100, ($attendance / 5) * 20); // up to 20 pts
                $taskScore = ($completedTasks / $totalTasks) * 40;   // up to 40 pts
                $logScore = min(100, $weeklyLogs * 5);                // up to 20 pts
                $evalScore = $midtermEval ? ($midtermEval->overall_rating / 5) * 20 : 0; // up to 20 pts

                $predicted = round($attendanceScore + $taskScore + $logScore + $evalScore, 0);

                $placement->predicted_score = $predicted;
                $placement->prediction_label = match (true) {
                    $predicted >= 80 => 'Excellent',
                    $predicted >= 65 => 'Good',
                    $predicted >= 50 => 'Average',
                    default => 'Needs Improvement',
                };

                return $placement;
            })
            ->sortByDesc('predicted_score');

        return view('ml.predict-performance', compact('placements'));
    }

    /**
     * Identify Skill Gaps — shows skills most lacking across all students.
     */
    public function identifySkillGaps(): View
    {
        $allStudentSkills = StudentProfile::with('skills')
            ->get()
            ->flatMap(fn ($s) => $s->skills->pluck('name')->map(fn ($n) => strtolower($n)))
            ->countBy()
            ->sortDesc();

        $allRequiredSkills = InternshipPosting::where('status', 'approved')
            ->whereNotNull('required_skills')
            ->pluck('required_skills')
            ->flatten()
            ->map(fn ($s) => strtolower($s))
            ->countBy()
            ->sortDesc();

        // Gaps = required skills that students lack
        $gaps = $allRequiredSkills->map(function ($demandCount, $skill) use ($allStudentSkills) {
            $supplyCount = $allStudentSkills->get($skill, 0);

            return [
                'skill' => $skill,
                'demand' => $demandCount,
                'supply' => $supplyCount,
                'gap' => max(0, $demandCount - $supplyCount),
            ];
        })
            ->filter(fn ($item) => $item['gap'] > 0)
            ->sortByDesc('gap')
            ->values();

        return view('ml.skill-gaps', compact('gaps', 'allRequiredSkills', 'allStudentSkills'));
    }

    /**
     * Generate Skill Recommendations per student.
     */
    public function skillRecommendations(): View
    {
        $students = StudentProfile::with(['skills', 'user'])
            ->get()
            ->map(function ($student) {
                $studentSkills = $student->skills->pluck('name')->map(fn ($n) => strtolower($n))->toArray();

                $allRequired = InternshipPosting::where('status', 'approved')
                    ->whereNotNull('required_skills')
                    ->pluck('required_skills')
                    ->flatten()
                    ->map(fn ($s) => strtolower($s))
                    ->unique();

                $missing = $allRequired->diff($studentSkills)->take(5)->values();
                $student->skill_gaps = $missing;

                return $student;
            })
            ->filter(fn ($s) => $s->skill_gaps->isNotEmpty());

        return view('ml.skill-recommendations', compact('students'));
    }
}
