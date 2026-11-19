<?php

namespace App\Console\Commands;

use App\Models\Skill;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

class SyncOnetTaxonomy extends Command
{
    protected $signature = 'taxonomy:sync-onet
        {--path= : Override the generated taxonomy JSON path}
        {--dry-run : Report changes without writing to the database}';

    protected $description = 'Sync generated O*NET skills into the operational taxonomy';

    public function handle(): int
    {
        $path = $this->option('path') ?: base_path('../ml/datasets/processed/onet_taxonomy.json');
        if (! File::exists($path)) {
            $this->error("O*NET taxonomy file not found: {$path}");
            return self::FAILURE;
        }

        $payload = json_decode(File::get($path), true);
        $skills = $payload['skills'] ?? null;
        if (! is_array($skills)) {
            $this->error('O*NET taxonomy file has no valid skills array.');
            return self::FAILURE;
        }

        $created = 0;
        $updated = 0;
        $skipped = 0;

        foreach ($skills as $item) {
            $name = trim((string) ($item['name'] ?? ''));
            if ($name === '') {
                $skipped++;
                continue;
            }

            $existing = Skill::where('name', $name)->first();
            if ($this->option('dry-run')) {
                $existing ? $updated++ : $created++;
                continue;
            }

            $skill = $existing ?: new Skill(['name' => $name]);
            $skill->canonical_name = $skill->canonical_name ?: $name;
            $skill->category = $skill->category ?: ($item['category'] ?? null);
            $skill->source = $skill->source ?: 'O*NET 31.0';
            $skill->is_active = $skill->is_active ?? true;
            if (! $existing || $skill->source === 'O*NET 31.0') {
                $skill->is_matchable = (bool) ($item['matchable'] ?? true);
            }
            $skill->save();

            $existing ? $updated++ : $created++;
        }

        $mode = $this->option('dry-run') ? ' (dry run)' : '';
        $this->info("O*NET taxonomy sync complete{$mode}: {$created} created, {$updated} updated, {$skipped} skipped.");

        return self::SUCCESS;
    }
}
