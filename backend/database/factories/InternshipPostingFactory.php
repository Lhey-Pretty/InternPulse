<?php

namespace Database\Factories;

use App\Models\CompanyProfile;
use App\Models\InternshipPosting;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<InternshipPosting>
 */
class InternshipPostingFactory extends Factory
{
    private static array $positions = [
        'Web Developer Intern', 'Software Developer Intern', 'IT Support Intern',
        'Data Entry Intern', 'Graphic Design Intern', 'Network Intern',
        'Accounting Intern', 'HR Intern', 'Marketing Intern', 'Business Analyst Intern',
    ];

    private static array $courses = ['BSIT', 'BSCS', 'BSIS', 'BSCpE', 'BSA', 'BSBA'];

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $position = fake()->randomElement(self::$positions);
        $start = fake()->dateTimeBetween('+1 month', '+3 months');
        $end = fake()->dateTimeBetween('+4 months', '+6 months');

        return [
            'company_profile_id' => CompanyProfile::factory(),
            'title' => $position,
            'position' => $position,
            'description' => fake()->paragraphs(3, true),
            'responsibilities' => fake()->paragraphs(2, true),
            'qualifications' => fake()->paragraph(),
            'required_skills' => fake()->randomElements(['PHP', 'Laravel', 'JavaScript', 'MySQL', 'Python', 'Excel', 'Word', 'Communication'], 3),
            'required_course' => fake()->randomElement(self::$courses),
            'required_year_level' => fake()->randomElement(['3rd Year', '4th Year']),
            'slots' => fake()->numberBetween(1, 5),
            'duration_months' => fake()->randomElement([3, 4, 6]),
            'required_hours' => 600,
            'location' => fake()->city().', Philippines',
            'work_setup' => fake()->randomElement(['on-site', 'remote', 'hybrid']),
            'is_paid' => fake()->boolean(30),
            'allowance' => fake()->optional(0.3)->randomFloat(2, 500, 5000),
            'application_deadline' => fake()->dateTimeBetween('+1 week', '+3 weeks')->format('Y-m-d'),
            'internship_start' => $start->format('Y-m-d'),
            'internship_end' => $end->format('Y-m-d'),
            'status' => 'approved',
            'rejection_reason' => null,
            'approved_by' => null,
            'approved_at' => now(),
        ];
    }

    public function pending(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'pending',
            'approved_at' => null,
        ]);
    }

    public function closed(): static
    {
        return $this->state(fn (array $attributes) => ['status' => 'closed']);
    }
}
