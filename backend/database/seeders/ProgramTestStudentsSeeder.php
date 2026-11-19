<?php

namespace Database\Seeders;

use App\Models\StudentProfile;
use App\Models\User;
use App\Support\AcademicPrograms;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class ProgramTestStudentsSeeder extends Seeder
{
    public function run(): void
    {
        $names = ['Alex', 'Bailey', 'Cameron', 'Drew', 'Elliot', 'Frankie', 'Gray', 'Harper', 'Indigo', 'Jordan'];
        $password = 'TestStudent@2026!';

        foreach (array_keys(AcademicPrograms::PROGRAMS) as $programIndex => $program) {
            $course = AcademicPrograms::PROGRAMS[$program][0];
            for ($number = 1; $number <= 10; $number++) {
                $key = sprintf('%02d%02d', $programIndex + 1, $number);
                $email = "test.{$program}.{$number}@internpulse.local";
                $firstName = $names[$number - 1];
                $lastName = 'Test'.($programIndex + 1).$number;
                $user = User::firstOrNew(['email' => $email]);
                $user->fill([
                    'name' => "$firstName $lastName",
                    'password' => Hash::make($password),
                    'password_changed_at' => now(),
                    'role' => 'student',
                    'is_active' => true,
                    'email_verified_at' => now(),
                ])->save();

                StudentProfile::updateOrCreate(['user_id' => $user->id], [
                    'student_id_number' => "IP-TEST-$key",
                    'first_name' => $firstName,
                    'last_name' => $lastName,
                    'course' => $course,
                    'program' => $program,
                    'year_level' => '4th Year',
                    'section' => 'A',
                    'school_name' => 'Mindoro State University',
                    'required_hours' => 600,
                ]);
            }
        }

        $this->command->info('Created 10 new test students for each academic program.');
        $this->command->info("Shared password: $password");
    }
}
