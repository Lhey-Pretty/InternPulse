<?php

namespace Database\Seeders;

use App\Models\CoordinatorProfile;
use App\Models\User;
use App\Support\AcademicPrograms;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class CoordinatorProgramSeeder extends Seeder
{
    public function run(): void
    {
        foreach (array_keys(AcademicPrograms::PROGRAMS) as $program) {
            if (CoordinatorProfile::where('program', $program)->exists()) {
                continue;
            }

            $email = 'coordinator.'.strtolower($program).'@internpulse.invalid';
            $user = User::firstOrCreate(
                ['email' => $email],
                [
                    'name' => "Unassigned {$program} Coordinator",
                    'password' => Hash::make(Str::random(64)),
                    'password_changed_at' => now(),
                    'must_change_password' => true,
                    'role' => 'coordinator',
                    'is_active' => false,
                ]
            );

            if (! $user->isCoordinator()) {
                continue;
            }

            CoordinatorProfile::updateOrCreate(
                ['user_id' => $user->id],
                [
                    'first_name' => 'Unassigned',
                    'last_name' => "{$program} Coordinator",
                    'department' => null,
                    'program' => $program,
                    'is_placeholder' => true,
                ]
            );
        }
    }
}
