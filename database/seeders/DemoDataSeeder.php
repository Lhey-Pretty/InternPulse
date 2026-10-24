<?php

namespace Database\Seeders;

use App\Models\Application;
use App\Models\CompanyProfile;
use App\Models\InternshipPlacement;
use App\Models\InternshipPosting;
use App\Models\Skill;
use App\Models\StudentProfile;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DemoDataSeeder extends Seeder
{
    public function run(): void
    {
        $skills = Skill::all();

        // --- Demo student ---
        $studentUser = User::firstOrCreate(
            ['email' => 'student@internpulse.com'],
            [
                'name' => 'Juan dela Cruz',
                'password' => Hash::make('password'),
                'role' => 'student',
                'is_active' => true,
                'email_verified_at' => now(),
            ]
        );

        $student = StudentProfile::firstOrCreate(
            ['user_id' => $studentUser->id],
            [
                'student_id_number' => 'BSIT-2024-0001',
                'first_name' => 'Juan',
                'last_name' => 'dela Cruz',
                'middle_name' => 'Reyes',
                'gender' => 'male',
                'birth_date' => '2002-05-15',
                'phone_number' => '09181234567',
                'address' => '123 Rizal St., Manila, Philippines',
                'course' => 'BSIT',
                'program' => 'BSIT',
                'year_level' => '4th Year',
                'section' => 'A',
                'school_name' => 'Technological University of the Philippines',
                'school_address' => 'Manila, Philippines',
                'required_hours' => 600,
                'bio' => 'A passionate IT student with interest in web development and system design.',
                'career_interests' => 'Web Development, Software Engineering',
            ]
        );

        // Attach some skills to demo student
        if ($skills->isNotEmpty()) {
            $skillIds = $skills->whereIn('name', ['PHP', 'Laravel', 'MySQL', 'JavaScript', 'HTML', 'CSS'])
                ->pluck('id');

            foreach ($skillIds as $skillId) {
                $student->studentSkills()->firstOrCreate(
                    ['skill_id' => $skillId],
                    ['proficiency_level' => 'intermediate']
                );
            }
        }

        // --- Demo company ---
        $companyUser = User::firstOrCreate(
            ['email' => 'company@internpulse.com'],
            [
                'name' => 'TechCorp Philippines',
                'password' => Hash::make('password'),
                'role' => 'company',
                'is_active' => true,
                'email_verified_at' => now(),
            ]
        );

        $company = CompanyProfile::firstOrCreate(
            ['user_id' => $companyUser->id],
            [
                'company_name' => 'TechCorp Philippines Inc.',
                'industry' => 'Information Technology',
                'description' => 'A leading IT solutions provider offering software development, IT consulting, and managed services.',
                'address' => '5F OneE-com Center, Mall of Asia Complex',
                'city' => 'Pasay City',
                'province' => 'Metro Manila',
                'website' => 'https://techcorp.ph',
                'contact_person' => 'Ana Reyes',
                'contact_phone' => '09271234567',
                'contact_email' => 'hr@techcorp.ph',
                'verification_status' => 'verified',
                'verified_at' => now(),
            ]
        );

        // --- Demo internship posting ---
        $posting = InternshipPosting::firstOrCreate(
            [
                'company_profile_id' => $company->id,
                'title' => 'Web Developer Intern',
            ],
            [
                'position' => 'Web Developer Intern',
                'description' => 'We are looking for a motivated Web Developer Intern to join our development team. You will assist in building and maintaining web applications using modern technologies.',
                'responsibilities' => "- Develop and maintain web applications\n- Write clean, maintainable code\n- Collaborate with the development team\n- Participate in code reviews",
                'qualifications' => "- Currently enrolled in BSIT, BSCS, or related course\n- Basic knowledge of PHP and JavaScript\n- Familiar with HTML/CSS\n- Good communication skills",
                'required_skills' => ['PHP', 'Laravel', 'MySQL', 'JavaScript', 'HTML'],
                'required_course' => 'BSIT',
                'required_year_level' => '4th Year',
                'slots' => 3,
                'duration_months' => 4,
                'required_hours' => 600,
                'location' => 'Pasay City, Metro Manila',
                'work_setup' => 'on-site',
                'is_paid' => true,
                'allowance' => 3000.00,
                'application_deadline' => now()->addDays(14)->format('Y-m-d'),
                'internship_start' => now()->addMonth()->format('Y-m-d'),
                'internship_end' => now()->addMonths(5)->format('Y-m-d'),
                'status' => 'approved',
                'approved_at' => now(),
            ]
        );

        // --- Demo application from demo student ---
        $application = Application::firstOrCreate(
            [
                'student_profile_id' => $student->id,
                'internship_posting_id' => $posting->id,
            ],
            [
                'status' => 'accepted',
                'cover_letter' => 'I am very interested in this internship opportunity and believe my skills in PHP and Laravel match your requirements.',
                'match_score' => 92.00,
                'match_details' => [
                    'matched_skills' => ['PHP', 'Laravel', 'MySQL', 'JavaScript', 'HTML'],
                    'missing_skills' => [],
                    'course_match' => true,
                    'year_level_match' => true,
                ],
                'applied_at' => now()->subDays(5),
            ]
        );

        // --- Demo active placement ---
        InternshipPlacement::firstOrCreate(
            [
                'student_profile_id' => $student->id,
                'internship_posting_id' => $posting->id,
            ],
            [
                'application_id' => $application->id,
                'start_date' => now()->subWeeks(2)->format('Y-m-d'),
                'end_date' => now()->addMonths(3)->format('Y-m-d'),
                'required_hours' => 600,
                'rendered_hours' => 80,
                'status' => 'active',
                'approved_at' => now()->subWeeks(2),
            ]
        );

        // --- Extra fake companies and students ---
        CompanyProfile::factory(5)->create();
        StudentProfile::factory(10)->create();
        InternshipPosting::factory(8)->recycle($company)->create();

        $this->command->info('Demo data seeded.');
        $this->command->info('  Student: student@internpulse.com / password');
        $this->command->info('  Company: company@internpulse.com / password');
    }
}
