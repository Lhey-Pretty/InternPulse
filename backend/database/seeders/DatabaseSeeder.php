<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     * Seeds only the official System Admin, per-program coordinator slots, and Real Skills.
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
