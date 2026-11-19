<?php

namespace App\Console\Commands;

use App\Models\Evaluation;
use App\Models\InternshipPlacement;
use Illuminate\Console\Command;

class TestEvaluationFlow extends Command
{
    protected $signature = 'evaluation:test {action=check}';
    protected $description = 'Test evaluation flow: check, create-sample, or clear';

    public function handle()
    {
        $action = $this->argument('action');

        switch ($action) {
            case 'check':
                $this->checkStatus();
                break;
            case 'create-sample':
                $this->createSampleEvaluation();
                break;
            case 'clear':
                $this->clearEvaluations();
                break;
            default:
                $this->error("Unknown action: {$action}");
                $this->info("Available actions: check, create-sample, clear");
        }
    }

    private function checkStatus()
    {
        $this->info("📊 EVALUATION SYSTEM STATUS");
        $this->newLine();

        $totalPlacements = InternshipPlacement::count();
        $activePlacements = InternshipPlacement::where('status', 'active')->count();
        $completedPlacements = InternshipPlacement::where('status', 'completed')->count();
        $totalEvaluations = Evaluation::count();
        $submittedEvaluations = Evaluation::whereNotNull('submitted_at')->count();

        $this->table(
            ['Metric', 'Count'],
            [
                ['Total Placements', $totalPlacements],
                ['Active Placements', $activePlacements],
                ['Completed Placements', $completedPlacements],
                ['Total Evaluations', $totalEvaluations],
                ['Submitted Evaluations', $submittedEvaluations],
            ]
        );

        $this->newLine();

        if ($completedPlacements === 0) {
            $this->warn("⚠️  No completed placements found!");
            $this->info("💡 Tip: Complete a placement first before creating evaluations.");
            $this->newLine();
            
            if ($activePlacements > 0) {
                $this->info("Available active placements:");
                $placements = InternshipPlacement::with(['studentProfile', 'internshipPosting'])
                    ->where('status', 'active')
                    ->limit(5)
                    ->get();

                foreach ($placements as $p) {
                    $student = $p->studentProfile;
                    $posting = $p->internshipPosting;
                    $hours = $p->hours_rendered ?? 0;
                    $required = $p->required_hours ?? 480;
                    $progress = $required > 0 ? round(($hours / $required) * 100, 1) : 0;

                    $this->line("  ID: {$p->id} | {$student->first_name} {$student->last_name} | {$posting->title} | {$hours}/{$required}h ({$progress}%)");
                }
            }
        } else {
            $this->info("✅ Found {$completedPlacements} completed placement(s)");
            
            if ($submittedEvaluations === 0) {
                $this->warn("⚠️  No evaluations submitted yet!");
                $this->info("💡 Run: php artisan evaluation:test create-sample");
            }
        }
    }

    private function createSampleEvaluation()
    {
        // Find first active or completed placement WITHOUT evaluation
        $placement = InternshipPlacement::with(['studentProfile', 'internshipPosting.companyProfile'])
            ->whereIn('status', ['active', 'completed'])
            ->whereDoesntHave('evaluations', function ($q) {
                $q->where('evaluation_period', 'final');
            })
            ->first();

        if (!$placement) {
            $this->error("❌ No placements available for evaluation!");
            $this->info("💡 All placements already have evaluations, or no placements exist.");
            $this->info("   Run: php artisan evaluation:test clear");
            return;
        }

        $student = $placement->studentProfile;
        $company = $placement->internshipPosting->companyProfile;

        $this->info("Creating sample evaluation for:");
        $this->line("  Student: {$student->first_name} {$student->last_name}");
        $this->line("  Company: {$company->company_name}");
        $this->line("  Placement ID: {$placement->id}");
        $this->newLine();

        // Generate realistic ratings (3-5 scale)
        $criteriaFields = Evaluation::criteriaFields();
        $ratings = [];
        
        foreach ($criteriaFields as $field) {
            $ratings[$field] = rand(3, 5); // 3-5 rating
        }

        $totalPoints = array_sum($ratings);
        $overallRating = round(array_sum($ratings) / count($ratings), 2);
        $equivalentRating = Evaluation::convertToEquivalentRating($totalPoints);

        $evaluation = Evaluation::create(array_merge($ratings, [
            'internship_placement_id' => $placement->id,
            'student_profile_id' => $placement->student_profile_id,
            'evaluation_period' => 'final',
            'evaluated_by' => $company->user_id,
            'overall_rating' => $overallRating,
            'total_points' => $totalPoints,
            'equivalent_rating' => $equivalentRating,
            'strengths' => 'Excellent work ethic, strong technical skills, and great team player.',
            'areas_for_improvement' => 'Could improve time management and communication skills.',
            'general_comments' => 'Overall a great intern who contributed significantly to our projects.',
            'recommendation' => 'highly_recommended',
            'rated_by_name' => 'Test Supervisor',
            'inclusive_training_period' => now()->subMonths(3)->format('M d, Y') . ' - ' . now()->format('M d, Y'),
            'agency_address' => $company->address ?? 'Test Address',
            'submitted_at' => now(),
        ]));

        $this->newLine();
        $this->info("✅ Sample evaluation created!");
        $this->table(
            ['Field', 'Value'],
            [
                ['Evaluation ID', $evaluation->id],
                ['Total Points', "{$totalPoints}/60"],
                ['Overall Rating', $overallRating],
                ['Equivalent Rating', $equivalentRating],
                ['Recommendation', $evaluation->recommendation],
                ['Submitted At', $evaluation->submitted_at],
            ]
        );

        $this->newLine();
        $this->info("🌐 Now check: http://localhost:5173/company/dashboard");
        $this->info("   Navigate to: Performance Evaluations tab");
    }

    private function clearEvaluations()
    {
        $count = Evaluation::count();
        
        if ($count === 0) {
            $this->info("No evaluations to clear.");
            return;
        }

        if ($this->confirm("Delete all {$count} evaluation(s)?", false)) {
            Evaluation::truncate();
            $this->info("✅ All evaluations cleared.");
        } else {
            $this->info("Cancelled.");
        }
    }
}
