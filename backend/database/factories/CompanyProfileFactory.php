<?php

namespace Database\Factories;

use App\Models\CompanyProfile;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CompanyProfile>
 */
class CompanyProfileFactory extends Factory
{
    private static array $industries = [
        'Information Technology', 'Software Development', 'BPO/Call Center',
        'Banking & Finance', 'Healthcare', 'Education', 'Manufacturing',
        'Retail & E-Commerce', 'Telecommunications', 'Government',
    ];

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory()->company(),
            'company_name' => fake()->company(),
            'industry' => fake()->randomElement(self::$industries),
            'description' => fake()->paragraphs(2, true),
            'address' => fake()->streetAddress(),
            'city' => fake()->city(),
            'province' => fake()->state(),
            'website' => fake()->url(),
            'contact_person' => fake()->name(),
            'contact_phone' => '09'.fake()->numerify('#########'),
            'contact_email' => fake()->companyEmail(),
            'logo_path' => null,
            'verification_status' => 'verified',
            'rejection_reason' => null,
            'verified_at' => now(),
            'verified_by' => null,
        ];
    }

    public function pending(): static
    {
        return $this->state(fn (array $attributes) => [
            'verification_status' => 'pending',
            'verified_at' => null,
        ]);
    }

    public function rejected(): static
    {
        return $this->state(fn (array $attributes) => [
            'verification_status' => 'rejected',
            'rejection_reason' => 'Incomplete company documents submitted.',
            'verified_at' => null,
        ]);
    }
}
