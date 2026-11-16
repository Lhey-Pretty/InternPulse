<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\CoordinatorProfile;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminSeeder extends Seeder
{
    public function run(): void
    {
        // Official system accounts. Companies and students are not pre-seeded.
        User::updateOrCreate(
            ['email' => 'bongabongmis@minsu.edu.ph'],
            [
                'name' => 'MinSU Bongabong MIS Administrator',
                'password' => Hash::make('@MinSU_Bongabong'),
                'password_changed_at' => now(),
                'role' => 'admin',
                'is_active' => true,
                'email_verified_at' => now(),
            ]
        );

        $coordinator = User::updateOrCreate(
            ['email' => 'coordinator@minsu.edu.ph'],
            [
                'name' => 'MinSU OJT Coordinator',
                'password' => Hash::make('@MinSU_Coord2026!'),
                'password_changed_at' => now(),
                'role' => 'coordinator',
                'is_active' => true,
                'email_verified_at' => now(),
            ]
        );

        CoordinatorProfile::updateOrCreate(
            ['user_id' => $coordinator->id],
            [
                'first_name' => 'MinSU',
                'last_name' => 'OJT Coordinator',
            ]
        );

        $this->command->info('Official MinSU admin and coordinator accounts seeded successfully.');
    }
}
