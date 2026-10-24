<?php

namespace Database\Seeders;

use App\Models\CoordinatorProfile;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminSeeder extends Seeder
{
    public function run(): void
    {
        // System Administrator
        $admin = User::firstOrCreate(
            ['email' => 'admin@internpulse.com'],
            [
                'name' => 'System Administrator',
                'password' => Hash::make('password'),
                'role' => 'admin',
                'is_active' => true,
                'email_verified_at' => now(),
            ]
        );

        // OJT Coordinator
        $coordinator = User::firstOrCreate(
            ['email' => 'coordinator@internpulse.com'],
            [
                'name' => 'Maria Santos',
                'password' => Hash::make('password'),
                'role' => 'coordinator',
                'is_active' => true,
                'email_verified_at' => now(),
            ]
        );

        if (! $coordinator->coordinatorProfile) {
            CoordinatorProfile::create([
                'user_id' => $coordinator->id,
                'first_name' => 'Maria',
                'last_name' => 'Santos',
                'middle_name' => 'Cruz',
                'employee_id' => 'EMP-0001',
                'department' => 'College of Computing',
                'phone_number' => '09171234567',
            ]);
        }

        $this->command->info('Admin and Coordinator accounts seeded.');
        $this->command->info('  Admin:       admin@internpulse.com / password');
        $this->command->info('  Coordinator: coordinator@internpulse.com / password');
    }
}
