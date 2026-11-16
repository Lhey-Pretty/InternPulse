<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     * Seeds only the official System Admin, Initial Coordinator, and Real Skills.
     * NO FAKE DATA (DemoDataSeeder is excluded).
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
