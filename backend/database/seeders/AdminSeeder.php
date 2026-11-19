<?php

namespace Database\Seeders;

use App\Models\User;
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

        $this->command->info('Official MinSU admin account seeded successfully. Program coordinators are provisioned separately.');
    }
}
