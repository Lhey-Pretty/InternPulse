<?php

namespace Database\Seeders;

use App\Models\StudentProfile;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class SampleUsersSeeder extends Seeder
{
    public function run(): void
    {
        $students = [
            ['name' => 'Adrian Santos', 'first_name' => 'Adrian', 'last_name' => 'Santos', 'course' => 'BSIT'],
            ['name' => 'Bianca Reyes', 'first_name' => 'Bianca', 'last_name' => 'Reyes', 'course' => 'BSCS'],
            ['name' => 'Carlo Mendoza', 'first_name' => 'Carlo', 'last_name' => 'Mendoza', 'course' => 'BSIS'],
            ['name' => 'Diana Cruz', 'first_name' => 'Diana', 'last_name' => 'Cruz', 'course' => 'BSIT'],
            ['name' => 'Ethan Garcia', 'first_name' => 'Ethan', 'last_name' => 'Garcia', 'course' => 'BSCpE'],
            ['name' => 'Fatima Navarro', 'first_name' => 'Fatima', 'last_name' => 'Navarro', 'course' => 'BSCS'],
            ['name' => 'Gabriel Flores', 'first_name' => 'Gabriel', 'last_name' => 'Flores', 'course' => 'BSIT'],
            ['name' => 'Hannah Aquino', 'first_name' => 'Hannah', 'last_name' => 'Aquino', 'course' => 'BSIS'],
            ['name' => 'Ivan Bautista', 'first_name' => 'Ivan', 'last_name' => 'Bautista', 'course' => 'BSIT'],
            ['name' => 'Jasmine Villanueva', 'first_name' => 'Jasmine', 'last_name' => 'Villanueva', 'course' => 'BSCS'],
        ];

        foreach ($students as $index => $student) {
            $studentIdNumber = 'IP-2026-'.str_pad((string) ($index + 1), 4, '0', STR_PAD_LEFT);
            $email = 'student'.str_pad((string) ($index + 1), 2, '0', STR_PAD_LEFT).'@minsu.edu.ph';
            $profile = StudentProfile::where('student_id_number', $studentIdNumber)->first();
            $user = $profile?->user ?? User::firstOrNew(['email' => $email]);
            $user->fill([
                'name' => $student['name'],
                'email' => $email,
                'password' => Hash::make('Student@2026!'.($index + 1)),
                'password_changed_at' => now(),
                'role' => 'student',
                'is_active' => true,
                'email_verified_at' => now(),
            ])->save();

            StudentProfile::updateOrCreate(
                ['user_id' => $user->id],
                [
                    'student_id_number' => $studentIdNumber,
                    'first_name' => $student['first_name'],
                    'last_name' => $student['last_name'],
                    'course' => $student['course'],
                    'program' => $student['course'],
                    'year_level' => '4th Year',
                    'section' => 'A',
                    'school_name' => 'Mindoro State University',
                    'required_hours' => 600,
                ]
            );
        }

        $this->command->info('10 sample students seeded successfully. Program coordinator accounts are provisioned separately.');
    }
}
