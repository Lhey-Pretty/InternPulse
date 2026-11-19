<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Skill;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;
use Symfony\Component\HttpFoundation\StreamedResponse;

class SkillController extends Controller
{
    /**
     * Official 12 MinSU Academic Programs.
     * Students only see skills matching their own program category.
     * New programs can be added here + to curated_skills.json without other code changes.
     */
    protected array $programs = [
        'BSIT' => [
            'name'       => 'BS in Information Technology',
            'department' => 'College of Computer Studies',
            'icon'       => '💻',
            'color'      => 'emerald',
        ],
        'BSCPE' => [
            'name'       => 'BS in Computer Engineering',
            'department' => 'College of Engineering & Technology',
            'icon'       => '⚙️',
            'color'      => 'indigo',
        ],
        'BSHM' => [
            'name'       => 'BS in Hospitality Management',
            'department' => 'College of Hospitality & Tourism',
            'icon'       => '🏨',
            'color'      => 'rose',
        ],
        'BSTM' => [
            'name'       => 'BS in Tourism Management',
            'department' => 'College of Hospitality & Tourism',
            'icon'       => '✈️',
            'color'      => 'amber',
        ],
        'BSCRIM' => [
            'name'       => 'BS in Criminology',
            'department' => 'College of Criminal Justice Education',
            'icon'       => '🛡️',
            'color'      => 'slate',
        ],
        'FISHERIES' => [
            'name'       => 'BS in Fisheries',
            'department' => 'College of Fisheries & Aquatic Sciences',
            'icon'       => '🐟',
            'color'      => 'cyan',
        ],
        'POLSCI' => [
            'name'       => 'BA in Political Science',
            'department' => 'College of Arts and Sciences',
            'icon'       => '⚖️',
            'color'      => 'violet',
        ],
        'BEED' => [
            'name'       => 'Bachelor of Elementary Education',
            'department' => 'College of Teacher Education',
            'icon'       => '📚',
            'color'      => 'pink',
        ],
        'BSED_MATH' => [
            'name'       => 'BSED - Major in Mathematics',
            'department' => 'College of Teacher Education',
            'icon'       => '📐',
            'color'      => 'emerald',
        ],
        'BSED_SCIENCE' => [
            'name'       => 'BSED - Major in Science',
            'department' => 'College of Teacher Education',
            'icon'       => '🔬',
            'color'      => 'green',
        ],
        'BSED_ENGLISH' => [
            'name'       => 'BSED - Major in English',
            'department' => 'College of Teacher Education',
            'icon'       => '📖',
            'color'      => 'yellow',
        ],
    ];

    public function index(Request $request): View
    {
        $totalSkills = Skill::count();
        $totalAssigned = Skill::has('students')->count();

        // Counts per program
        $counts = Skill::selectRaw('category, count(*) as count')
            ->groupBy('category')
            ->pluck('count', 'category')
            ->toArray();

        // Sample top skills per program for preview
        $sampleSkills = [];
        $skillsByProgram = [];

        foreach (array_keys($this->programs) as $progKey) {
            $sampleSkills[$progKey] = Skill::where('category', $progKey)
                ->orderBy('name')
                ->take(4)
                ->pluck('name')
                ->toArray();

            // Load all skills for each program (for the quick modal viewer)
            $skillsByProgram[$progKey] = Skill::where('category', $progKey)
                ->orderBy('name')
                ->get(['id', 'name', 'category']);
        }

        return view('admin.skills.index', [
            'programs' => $this->programs,
            'counts' => $counts,
            'sampleSkills' => $sampleSkills,
            'skillsByProgram' => $skillsByProgram,
            'totalSkills' => $totalSkills,
            'totalAssigned' => $totalAssigned,
        ]);
    }

    /**
     * Export master skills directly to CSV (opens natively in Microsoft Excel)
     */
    public function exportCsv(Request $request): StreamedResponse
    {
        $category = $request->input('category');
        $query = Skill::withCount('students');

        if ($category) {
            $query->where('category', $category);
        }

        $skills = $query->orderBy('category')->orderBy('name')->get();

        $filename = $category 
            ? "MinSU_Skills_{$category}_" . date('Y-m-d') . '.csv'
            : 'MinSU_Master_Skills_Matrix_' . date('Y-m-d') . '.csv';

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ];

        return response()->stream(function () use ($skills) {
            $file = fopen('php://output', 'w');
            // Write UTF-8 BOM so Microsoft Excel renders accented/special characters correctly
            fprintf($file, chr(0xEF).chr(0xBB).chr(0xBF));

            fputcsv($file, [
                'ID',
                'Academic Program',
                'Skill Name',
                'Number of Students with that Skill',
            ]);

            foreach ($skills as $skill) {
                fputcsv($file, [
                    $skill->id,
                    $skill->category,
                    $skill->name,
                    $skill->students_count,
                ]);
            }

            fclose($file);
        }, 200, $headers);
    }

    /**
     * Import / Sync skills updated via Microsoft Excel
     */
    public function importCsv(Request $request): RedirectResponse
    {
        $request->validate([
            'skills_file' => ['required', 'file', 'mimes:csv,txt', 'max:10240'],
        ]);

        $file = $request->file('skills_file');
        $handle = fopen($file->getRealPath(), 'r');

        if (! $handle) {
            return back()->with('error', 'Unable to open the uploaded Excel file.');
        }

        // Read header
        $header = fgetcsv($handle);
        if (! $header) {
            fclose($handle);
            return back()->with('error', 'The uploaded file is empty.');
        }

        // Clean UTF-8 BOM from the first header column if present
        $header[0] = preg_replace('/[\xEF\xBB\xBF]/', '', $header[0]);
        $header = array_map(fn ($h) => strtolower(trim($h)), $header);

        // Find relevant column indexes
        $idIdx = array_search('id', $header);
        $programIdx = false;
        $skillIdx = false;

        foreach ($header as $idx => $col) {
            if (str_contains($col, 'program') || str_contains($col, 'category') || str_contains($col, 'course')) {
                $programIdx = $idx;
            }
            if ((str_contains($col, 'skill') || str_contains($col, 'name') || str_contains($col, 'competency')) 
                && !str_contains($col, 'student') && !str_contains($col, 'number') && !str_contains($col, 'intern') && !str_contains($col, 'count')) {
                $skillIdx = $idx;
            }
        }

        if ($programIdx === false || $skillIdx === false) {
            // Fallback: column 1 is program, column 2 is skill name
            $programIdx = 1;
            $skillIdx = 2;
        }

        $processed = 0;
        $created = 0;
        $updated = 0;

        while (($row = fgetcsv($handle)) !== false) {
            if (empty($row) || count($row) < 2) {
                continue;
            }

            $category = trim($row[$programIdx] ?? '');
            $name = trim($row[$skillIdx] ?? '');
            $skillId = ($idIdx !== false && ! empty($row[$idIdx])) ? (int) $row[$idIdx] : null;

            if (empty($name) || empty($category)) {
                continue;
            }

            if ($skillId) {
                $existing = Skill::find($skillId);
                if ($existing) {
                    $existing->update([
                        'name' => $name,
                        'category' => $category,
                    ]);
                    $updated++;
                    $processed++;
                    continue;
                }
            }

            // If no ID or not found by ID, update or create by name
            $skill = Skill::updateOrCreate(
                ['name' => $name],
                ['category' => $category]
            );

            if ($skill->wasRecentlyCreated) {
                $created++;
            } else {
                $updated++;
            }
            $processed++;
        }

        fclose($handle);

        return back()->with('success', "Successfully synced Excel skills! Processed: {$processed} ({$created} new, {$updated} updated).");
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150', 'unique:skills,name'],
            'category' => ['required', 'string', 'max:100'],
        ]);

        Skill::create($validated);

        return back()->with('success', "Skill \"{$validated['name']}\" added successfully to {$validated['category']}.");
    }

    public function update(Request $request, Skill $skill): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150', 'unique:skills,name,'.$skill->id],
            'category' => ['required', 'string', 'max:100'],
        ]);

        $skill->update($validated);

        return back()->with('success', "Skill \"{$skill->name}\" updated successfully.");
    }

    public function destroy(Skill $skill): RedirectResponse
    {
        $name = $skill->name;
        $skill->delete();

        return back()->with('success', "Skill \"{$name}\" deleted.");
    }
}
