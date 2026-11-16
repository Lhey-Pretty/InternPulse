<?php

namespace Database\Factories;

use App\Models\Application;
use App\Models\InternshipPosting;
use App\Models\StudentProfile;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Application>
 */
class ApplicationFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'student_profile_id' => StudentProfile::factory(),
            'internship_posting_id' => InternshipPosting::factory(),
            'status' => fake()->randomElement(['pending', 'shortlisted', 'accepted', 'rejected']),
            'cover_letter' => fake()->optional()->paragraphs(2, true),
            'resume_path' => null,
            'match_score' => fake()->optional(0.8)->randomFloat(2, 40, 99),
            'match_details' => null,
            'applied_at' => fake()->dateTimeBetween('-1 month', 'now'),
        ];
    }

    public function pending(): static
    {
        return $this->state(fn (array $attributes) => ['status' => 'pending']);
    }

    public function accepted(): static
    {
        return $this->state(fn (array $attributes) => ['status' => 'accepted']);
    }
}
