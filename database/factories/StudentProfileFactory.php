<?php

namespace Database\Factories;

use App\Models\StudentProfile;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<StudentProfile>
 */
class StudentProfileFactory extends Factory
{
    private static array $courses = ['BSIT', 'BSCS', 'BSIS', 'BSCpE', 'BSECE', 'BSEE', 'BSA', 'BSBA', 'BSHRM', 'BSN'];

    private static array $yearLevels = ['1st Year', '2nd Year', '3rd Year', '4th Year'];

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $firstName = fake()->firstName();
        $lastName = fake()->lastName();
        $course = fake()->randomElement(self::$courses);

        return [
            'user_id' => User::factory()->student(),
            'student_id_number' => strtoupper($course).'-'.fake()->year().'-'.fake()->numerify('####'),
            'first_name' => $firstName,
            'last_name' => $lastName,
            'middle_name' => fake()->optional(0.7)->lastName(),
            'gender' => fake()->randomElement(['male', 'female']),
            'birth_date' => fake()->dateTimeBetween('-25 years', '-18 years')->format('Y-m-d'),
            'phone_number' => '09'.fake()->numerify('#########'),
            'address' => fake()->address(),
            'course' => $course,
            'program' => $course,
            'year_level' => fake()->randomElement(self::$yearLevels),
            'section' => fake()->randomElement(['A', 'B', 'C', 'D']),
            'school_name' => fake()->company().' University',
            'school_address' => fake()->city().', Philippines',
            'required_hours' => 600,
            'bio' => fake()->optional()->paragraph(),
            'career_interests' => fake()->optional()->sentence(),
            'resume_path' => null,
            'profile_photo_path' => null,
        ];
    }
}
