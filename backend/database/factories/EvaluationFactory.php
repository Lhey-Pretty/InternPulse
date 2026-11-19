<?php

namespace Database\Factories;

use App\Models\Evaluation;
use App\Models\InternshipPlacement;
use App\Models\StudentProfile;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Evaluation>
 */
class EvaluationFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $score = fn () => fake()->randomFloat(1, 1, 5);

        return [
            'internship_placement_id' => InternshipPlacement::factory(),
            'student_profile_id' => StudentProfile::factory(),
            'evaluated_by' => User::factory()->company(),
            'evaluation_period' => fake()->randomElement(['midterm', 'final']),
            'work_quality' => $score(),
            'work_quantity' => $score(),
            'punctuality' => $score(),
            'attendance_score' => $score(),
            'initiative' => $score(),
            'teamwork' => $score(),
            'communication' => $score(),
            'problem_solving' => $score(),
            'technical_skills' => $score(),
            'professionalism' => $score(),
            'overall_rating' => fake()->randomFloat(2, 2.5, 5.0),
            'strengths' => fake()->sentence(),
            'areas_for_improvement' => fake()->sentence(),
            'general_comments' => fake()->paragraph(),
            'recommendation' => fake()->randomElement(['highly_recommended', 'recommended', 'needs_improvement']),
            'submitted_at' => now(),
        ];
    }
}
