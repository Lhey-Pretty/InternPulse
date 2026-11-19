<?php

namespace App\Console\Commands;

use App\Models\StudentProfile;
use App\Models\User;
use App\Models\InternshipPlacement;
use App\Models\InternshipPosting;
use App\Models\Application;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;

class AddTestInterns extends Command
{
    protected $signature = 'interns:add-test';
    protected $description = 'Add test interns with "i baga" names for demonstration';

    public function handle()
    {
        $this->info('Adding test interns...');

        $testStudents = [
            ['first_name' => 'Maria', 'last_name' => 'Baga', 'student_id' => 'SID001'],
            ['first_name' => 'Juan', 'last_name' => 'Baga', 'student_id' => 'SID002'],
            ['first_name' => 'Rosa', 'last_name' => 'Baga', 'student_id' => 'SID003'],
            ['first_name' => 'Pedro', 'last_name' => 'Baga', 'student_id' => 'SID004'],
            ['first_name' => 'Ana', 'last_name' => 'Baga', 'student_id' => 'SID005'],
        ];

        foreach ($testStudents as $i => $studentData) {
            // Create user
            $user = User::firstOrCreate(
                ['email' => "ibaga{$i}@student.minsu.edu"],
                [
                    'name' => "{$studentData['first_name']} {$studentData['last_name']}",
                    'password' => Hash::make('password'),
                    'role' => 'student',
                ]
            );

            // Create student profile
            $student = StudentProfile::firstOrCreate(
                ['user_id' => $user->id],
                [
                    'first_name' => $studentData['first_name'],
                    'last_name' => $studentData['last_name'],
                    'middle_name' => 'Test',
                    'student_id_number' => $studentData['student_id'],
                    'course' => 'BS Information Technology',
                    'year_level' => 3,
                    'school_name' => 'Mindanao State University',
                ]
            );

            // Add placement if not exists
            if (!InternshipPlacement::where('student_profile_id', $student->id)->exists()) {
                $posting = InternshipPosting::whereNotNull('id')->first();
                
                if ($posting) {
                    // Create an application first
                    $application = \App\Models\Application::create([
                        'student_profile_id' => $student->id,
                        'internship_posting_id' => $posting->id,
                        'status' => 'accepted',
                        'applied_at' => now(),
                    ]);

                    InternshipPlacement::create([
                        'student_profile_id' => $student->id,
                        'internship_posting_id' => $posting->id,
                        'application_id' => $application->id,
                        'status' => 'active',
                        'start_date' => now(),
                        'end_date' => now()->addMonths(3),
                        'required_hours' => 480,
                        'hours_rendered' => rand(0, 200),
                    ]);

                    $this->line("✓ Created intern: {$studentData['first_name']} {$studentData['last_name']}");
                }
            }
        }

        $this->info('✅ Test interns added successfully!');
        $this->line('Search for "baga" or any of the first names to test the search feature.');
    }
}
