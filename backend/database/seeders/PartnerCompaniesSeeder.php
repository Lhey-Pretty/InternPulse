<?php

namespace Database\Seeders;

use App\Models\CompanyProfile;
use App\Models\InternshipPosting;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class PartnerCompaniesSeeder extends Seeder
{
    /**
     * Seed the 9 official Host Training Establishments (HTEs) from
     * "List-of-HTEs2025-OJT.docx" as pre-verified partner companies.
     *
     * A user account is created for each company (role = 'company').
     * All accounts are set as pre-verified since these are official
     * accredited partners of the campus.
     *
     * All accounts have unique passwords and Gmail addresses.
     * Credentials are listed below — companies should change passwords upon first login.
     */
    public function run(): void
    {
        $htes = [
            [
                'name'         => 'SECITS Security and IT Solutions',
                'email'        => 'secits.hte2025@gmail.com',
                'password'     => 'Secits@HTE2025!',
                'company_name' => 'SECITS Security and IT Solutions',
                'industry'     => 'Information Technology / Security',
                'type'         => 'Non-Government',
                'address'      => 'J.P. Rizal St., Sampaloc',
                'city'         => 'Sampaloc',
                'province'     => 'Metro Manila',
                'website'      => 'https://secitstechnology.wixsite.com/secits',
                'facebook_page'=> 'https://www.facebook.com/Secitsstore/?checkpoint_src',
            ],
            [
                'name'         => 'Imergex Information Technology Inc.',
                'email'        => 'imergex.hte2025@gmail.com',
                'password'     => 'Imergex@HTE2025!',
                'company_name' => 'Imergex Information Technology Inc.',
                'industry'     => 'Information Technology',
                'type'         => 'Non-Government',
                'address'      => 'J.P. Rizal St., San Vicente',
                'city'         => 'Calapan City',
                'province'     => 'Oriental Mindoro',
                'website'      => 'https://imergex.com',
            ],
            [
                'name'         => 'Armlink Computer Center Inc.',
                'email'        => 'armlink.hte2025@gmail.com',
                'password'     => 'Armlink@HTE2025!',
                'company_name' => 'Armlink Computer Center Inc.',
                'industry'     => 'Information Technology',
                'type'         => 'Non-Government',
                'address'      => 'Rizal Village, Camilmil',
                'city'         => 'Calapan City',
                'province'     => 'Oriental Mindoro',
                'website'      => 'https://armlinkcomputer.com',
            ],
            [
                'name'         => 'Infinitech Advertising Corporation',
                'email'        => 'infinitech.hte2025@gmail.com',
                'password'     => 'Infinitech@HTE2025!',
                'company_name' => 'Infinitech Advertising Corporation',
                'industry'     => 'Advertising / Information Technology',
                'type'         => 'Non-Government',
                'address'      => 'Poblacion',
                'city'         => 'Bongabong',
                'province'     => 'Oriental Mindoro',
                'website'      => 'https://infinitech-advertising.com',
            ],
            [
                'name'         => 'Pigmentex Inc.',
                'email'        => 'pigmentex.hte2025@gmail.com',
                'password'     => 'Pigmentex@HTE2025!',
                'company_name' => 'Pigmentex Inc.',
                'industry'     => 'Manufacturing / Technology',
                'type'         => 'Non-Government',
                'address'      => 'Balintawak Industrial Estate',
                'city'         => 'Quezon City',
                'province'     => 'Metro Manila',
                'website'      => 'https://pigmentex.com.ph',
            ],
            [
                'name'         => 'Bureau of Fire Protection MIMAROPA Region',
                'email'        => 'bfp.mimaropa.hte2025@gmail.com',
                'password'     => 'BFPMimaropa@HTE2025!',
                'company_name' => 'Bureau of Fire Protection — MIMAROPA Regional Office',
                'industry'     => 'Government / Public Safety',
                'type'         => 'Government',
                'address'      => 'Brgy. Suqui',
                'city'         => 'Calapan City',
                'province'     => 'Oriental Mindoro',
                'website'      => 'https://mimaropa.bfp.gov.ph',
            ],
            [
                'name'         => 'Media and Civil Affairs Group CRSAFP',
                'email'        => 'mcag.crsafp.hte2025@gmail.com',
                'password'     => 'MCagCRSAFP@HTE2025!',
                'company_name' => 'Media and Civil Affairs Group, CRSAFP',
                'industry'     => 'Government / Military / Media',
                'type'         => 'Government',
                'address'      => 'Camp General Emilio Aguinaldo',
                'city'         => 'Quezon City',
                'province'     => 'Metro Manila',
                'website'      => 'https://crsafp.mil.ph',
            ],
            [
                'name'         => 'Tripodlink',
                'email'        => 'tripodlink.hte2025@gmail.com',
                'password'     => 'Tripodlink@HTE2025!',
                'company_name' => 'Tripodlink',
                'industry'     => 'Information Technology',
                'type'         => 'Non-Government',
                'address'      => 'San Aquilino',
                'city'         => 'Roxas',
                'province'     => 'Oriental Mindoro',
                'website'      => 'https://tripodlink.ph',
            ],
            [
                'name'         => 'Elijah Hotel and Residences',
                'email'        => 'elijahhotel.hte2025@gmail.com',
                'password'     => 'ElijahHotel@HTE2025!',
                'company_name' => 'Elijah Hotel & Residences',
                'industry'     => 'Hospitality / Tourism',
                'type'         => 'Non-Government',
                'address'      => 'Marfrancisco',
                'city'         => 'Pinamalayan',
                'province'     => 'Oriental Mindoro',
                'website'      => 'https://elijahhotel.ph',
            ],
        ];

        $now  = now();

        // Clean up old HTE accounts with the deprecated @hte.internpulse.local domain
        $oldEmails = User::where('email', 'like', '%@hte.internpulse.local')->get();
        foreach ($oldEmails as $oldUser) {
            $oldUser->companyProfile?->delete();
            $oldUser->delete();
        }
        if ($oldEmails->count() > 0) {
            $this->command->line("  Removed {$oldEmails->count()} old HTE accounts (internpulse.local).");
        }

        // Find the admin user to set as verifier
        $admin = User::where('role', 'admin')->first();

        foreach ($htes as $hte) {
            // Skip if a user with this email already exists
            if (User::where('email', $hte['email'])->exists()) {
                $this->command->line("  Skipping {$hte['company_name']} — already exists.");
                continue;
            }

            $user = User::create([
                'name'              => $hte['name'],
                'email'             => $hte['email'],
                'password'          => Hash::make($hte['password']),
                'password_changed_at' => now(),
                'role'              => 'company',
                'is_active'         => true,
                'is_temporary'      => false,
                'email_verified_at' => $now,
            ]);

            CompanyProfile::create([
                'user_id'                  => $user->id,
                'company_name'             => $hte['company_name'],
                'industry'                 => $hte['industry'],
                'description'              => "Official accredited Host Training Establishment (HTE) partner — {$hte['type']}.",
                'address'                  => $hte['address'] ?? 'Philippines',
                'city'                     => $hte['city'] ?? null,
                'province'                 => $hte['province'] ?? null,
                'website'                  => $hte['website'] ?? null,
                'facebook_page'            => $hte['facebook_page'] ?? null,
                'verification_status'      => 'verified',
                'verified_at'              => $now,
                'verified_by'              => $admin?->id,
                'eligibility_status'       => 'eligible',
                'eligibility_notes'        => 'Pre-accredited HTE from the official OJT partner list (A.Y. 2025).',
                'eligibility_reviewed_at'  => $now,
            ]);

            $this->command->info("  ✓ Created: {$hte['company_name']}");
        }

        $postings = [
            'SECITS Security and IT Solutions' => [
                'title' => 'Cybersecurity and IT Support Intern',
                'course' => 'BSIT',
                'skills' => ['Networking', 'Cybersecurity', 'Troubleshooting', 'Documentation'],
            ],
            'Imergex Information Technology Inc.' => [
                'title' => 'Software Development Intern',
                'course' => 'BSIT',
                'skills' => ['PHP', 'Laravel', 'JavaScript', 'MySQL'],
            ],
            'Armlink Computer Center Inc.' => [
                'title' => 'Computer Systems Support Intern',
                'course' => 'BSIT',
                'skills' => ['Hardware', 'Networking', 'Troubleshooting', 'Technical Support'],
            ],
            'Infinitech Advertising Corporation' => [
                'title' => 'Web and Digital Marketing Intern',
                'course' => 'BSIT',
                'skills' => ['HTML', 'CSS', 'JavaScript', 'Content Creation'],
            ],
            'Pigmentex Inc.' => [
                'title' => 'IT Operations Intern',
                'course' => 'BSIT',
                'skills' => ['Excel', 'Data Management', 'Systems Support', 'Documentation'],
            ],
            'Bureau of Fire Protection — MIMAROPA Regional Office' => [
                'title' => 'Information Systems Intern',
                'course' => 'BSIT',
                'skills' => ['Database', 'Data Entry', 'Documentation', 'Office Applications'],
            ],
            'Media and Civil Affairs Group, CRSAFP' => [
                'title' => 'Digital Media and Information Intern',
                'course' => 'BSIT',
                'skills' => ['Graphic Design', 'Video Editing', 'Social Media', 'Communication'],
            ],
            'Tripodlink' => [
                'title' => 'Network and Web Services Intern',
                'course' => 'BSIT',
                'skills' => ['Networking', 'Web Development', 'Linux', 'Troubleshooting'],
            ],
            'Elijah Hotel & Residences' => [
                'title' => 'Hospitality Systems Intern',
                'course' => 'BSIT',
                'skills' => ['Computer Support', 'Database', 'Excel', 'Customer Service'],
            ],
        ];

        foreach ($postings as $companyName => $posting) {
            $company = CompanyProfile::where('company_name', $companyName)->first();

            if (! $company) {
                continue;
            }

            InternshipPosting::firstOrCreate(
                [
                    'company_profile_id' => $company->id,
                    'title' => $posting['title'],
                ],
                [
                    'position' => $posting['title'],
                    'description' => "Gain practical experience with {$companyName} while developing skills relevant to your academic program.",
                    'responsibilities' => "Assist with daily IT and project tasks.\nPrepare documentation and reports.\nSupport the assigned team and complete related internship activities.",
                    'qualifications' => "Currently enrolled in {$posting['course']} or a related program.\nWilling to learn and work collaboratively.\nAble to complete the required internship hours.",
                    'required_skills' => $posting['skills'],
                    'required_course' => $posting['course'],
                    'required_year_level' => '4th Year',
                    'slots' => 3,
                    'duration_months' => 4,
                    'required_hours' => 600,
                    'location' => 'MIMAROPA, Philippines',
                    'work_setup' => 'on-site',
                    'is_paid' => false,
                    'allowance' => null,
                    'application_deadline' => now()->addMonths(2)->toDateString(),
                    'internship_start' => now()->addMonths(3)->toDateString(),
                    'internship_end' => now()->addMonths(7)->toDateString(),
                    'status' => 'approved',
                    'approved_by' => $admin?->id,
                    'approved_at' => $now,
                ]
            );
        }

        $this->command->info('PartnerCompaniesSeeder done — 9 HTEs and 9 internship postings seeded.');
    }
}
