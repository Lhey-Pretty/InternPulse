<?php

namespace Database\Factories;

use App\Models\Application;
use App\Models\InternshipPlacement;
use App\Models\InternshipPosting;
use App\Models\StudentProfile;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<InternshipPlacement>
 */
class InternshipPlacementFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $renderedHours = fake()->numberBetween(0, 600);

        return [
            'student_profile_id' => StudentProfile::factory(),
            'internship_posting_id' => InternshipPosting::factory(),
            'application_id' => Application::factory(),
            'approved_by' => null,
            'start_date' => fake()->dateTimeBetween('-3 months', '-1 month')->format('Y-m-d'),
            'end_date' => fake()->dateTimeBetween('+1 month', '+3 months')->format('Y-m-d'),
            'required_hours' => 600,
            'rendered_hours' => $renderedHours,
            'status' => 'active',
            'termination_reason' => null,
            'approved_at' => now(),
        ];
    }

    public function completed(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'completed',
            'rendered_hours' => 600,
        ]);
    }
}
