<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     * Seeds the system admin, sample students, per-program coordinator slots,
     * partner companies, and skills. Test-named student generators remain opt-in.
     */
    public function run(): void
    {
        $this->call([
            SkillsSeeder::class,
            AdminSeeder::class,
            SampleUsersSeeder::class,
            CoordinatorProgramSeeder::class,
            PartnerCompaniesSeeder::class,
        ]);
    }
}
