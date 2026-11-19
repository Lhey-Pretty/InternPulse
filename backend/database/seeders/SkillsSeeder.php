<?php

namespace Database\Seeders;

use App\Models\Skill;
use App\Support\AcademicPrograms;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\File;

class SkillsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * Seeds real industry skills from curated O*NET & HuggingFace datasets
     * mapped across OJT programs:
     * BSIT, BSCPE, BSTM, BSHM, BSCRIM, FISHERIES, POLSCI, BEED, BSED_ENGLISH, BSED_SCIENCE, BSED_MATH
     *
     * Students only see skills relevant to their own program.
     * New programs can be added dynamically — add a key to curated_skills.json and re-seed.
     */
    public function run(): void
    {
        $jsonPath = base_path('../ml/datasets/curated_skills.json');

        if (!File::exists($jsonPath)) {
            $this->command?->error("Curated skills dataset not found at: {$jsonPath}");
            return;
        }

        $curatedSkills = json_decode(File::get($jsonPath), true);
        if (!is_array($curatedSkills)) {
            $this->command?->error("Invalid JSON format in curated skills dataset.");
            return;
        }

        $now = now();
        $totalProcessed = 0;
        $programsProcessed = 0;

        foreach ($curatedSkills as $program => $skills) {
            if (! array_key_exists($program, AcademicPrograms::PROGRAMS)) {
                continue;
            }

            $programsProcessed++;
            $records = [];
            foreach ($skills as $skillName) {
                $trimmed = trim($skillName);
                if (!empty($trimmed)) {
                    $records[] = [
                        'name' => $trimmed,
                        'category' => $program,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                }
            }

            // Insert in chunks with upsert to prevent duplicates and ensure fast execution
            foreach (array_chunk($records, 100) as $chunk) {
                Skill::upsert($chunk, ['name'], ['category', 'updated_at']);
                $totalProcessed += count($chunk);
            }
        }

        $this->command?->info("Successfully seeded {$totalProcessed} skills across {$programsProcessed} OJT programs from O*NET and HuggingFace.");
    }
}
