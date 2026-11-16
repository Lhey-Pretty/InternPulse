<?php

namespace Database\Factories;

use App\Models\CoordinatorProfile;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CoordinatorProfile>
 */
class CoordinatorProfileFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory()->coordinator(),
            'first_name' => fake()->firstName(),
            'last_name' => fake()->lastName(),
            'middle_name' => fake()->optional(0.6)->lastName(),
            'employee_id' => 'EMP-'.fake()->numerify('####'),
            'department' => fake()->randomElement([
                'College of Computing', 'College of Engineering',
                'College of Business', 'College of Nursing',
                'OJT Office', 'Career Development Office',
            ]),
            'phone_number' => '09'.fake()->numerify('#########'),
            'profile_photo_path' => null,
        ];
    }
}
