<?php

namespace Database\Seeders;

use App\Models\Skill;
use Illuminate\Database\Seeder;

class SkillsSeeder extends Seeder
{
    /**
     * @var array<string, string[]>
     */
    private array $skills = [
        'Programming' => [
            'PHP', 'Python', 'Java', 'JavaScript', 'TypeScript', 'C++', 'C#',
            'Go', 'Kotlin', 'Swift', 'Ruby', 'Rust',
        ],
        'Web Development' => [
            'HTML', 'CSS', 'React', 'Vue.js', 'Angular', 'Laravel', 'Node.js',
            'Django', 'Spring Boot', 'Bootstrap', 'Tailwind CSS', 'WordPress',
        ],
        'Database' => [
            'MySQL', 'PostgreSQL', 'MongoDB', 'SQLite', 'Redis', 'Oracle', 'SQL Server',
        ],
        'Design' => [
            'Figma', 'Adobe Photoshop', 'Adobe Illustrator', 'Canva', 'UI/UX Design',
            'Graphic Design', 'Video Editing',
        ],
        'Networking' => [
            'Network Administration', 'Cisco', 'Linux', 'Windows Server',
            'Cloud Computing', 'AWS', 'Azure',
        ],
        'Business' => [
            'Microsoft Excel', 'Microsoft Word', 'Microsoft PowerPoint',
            'Accounting', 'Bookkeeping', 'Financial Analysis', 'Digital Marketing',
            'Social Media Management', 'Content Writing', 'Customer Service',
        ],
        'Soft Skills' => [
            'Communication', 'Teamwork', 'Problem Solving', 'Time Management',
            'Leadership', 'Critical Thinking', 'Adaptability',
        ],
    ];

    public function run(): void
    {
        foreach ($this->skills as $category => $names) {
            foreach ($names as $name) {
                Skill::firstOrCreate(['name' => $name], ['category' => $category]);
            }
        }
    }
}
