<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            SkillsSeeder::class,
            AdminSeeder::class,
            DemoDataSeeder::class,
        ]);

        // A manager account used to test the manager abilities
        \App\Models\User::firstOrCreate(
            ['email' => 'manager@manager.com'],
            [
                'name' => 'The Manager',
                'password' => bcrypt('password'),
                'is_manager' => true,
                'role' => 'admin',
                'is_active' => true,
            ]
        );
    }
}
