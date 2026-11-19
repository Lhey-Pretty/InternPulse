<?php

namespace App\Console\Commands;

use App\Models\InternshipPlacement;
use App\Models\PlacementRecommendation;
use App\Models\StudentProfile;
use App\Models\InternshipPosting;
use App\Models\Application;
use Illuminate\Console\Command;

class CheckPlacementSystem extends Command
{
    protected $signature = 'placement:check';

    protected $description = 'Check placement system data and identify issues';

    public function handle(): int
    {
        $this->info('=== PLACEMENT SYSTEM CHECK ===');
        $this->newLine();

        // Check students
        $totalStudents = StudentProfile::count();
        $placedStudents = StudentProfile::whereHas('placements', function ($q) {
            $q->where('status', 'active');
        })->count();
        $unplacedStudents = $totalStudents - $placedStudents;

        $this->info("📊 STUDENTS");
        $this->line("  Total: {$totalStudents}");
        $this->line("  Placed (active): {$placedStudents}");
        $this->line("  Unplaced: {$unplacedStudents}");
        $this->newLine();

        // Check postings
        $totalPostings = InternshipPosting::count();
        $approvedPostings = InternshipPosting::where('status', 'approved')->count();
        
        $this->info("📋 INTERNSHIP POSTINGS");
        $this->line("  Total: {$totalPostings}");
        $this->line("  Approved: {$approvedPostings}");
        $this->newLine();

        // Check applications
        $totalApplications = Application::count();
        $acceptedApps = Application::where('status', 'accepted')->count();
        $pendingApps = Application::where('status', 'pending')->count();
        
        $this->info("📝 APPLICATIONS");
        $this->line("  Total: {$totalApplications}");
        $this->line("  Accepted: {$acceptedApps}");
        $this->line("  Pending: {$pendingApps}");
        $this->newLine();

        // Check recommendations
        $totalRecs = PlacementRecommendation::count();
        $pendingRecs = PlacementRecommendation::where('status', 'pending')->count();
        $confirmedRecs = PlacementRecommendation::where('status', 'confirmed')->count();
        $rejectedRecs = PlacementRecommendation::where('status', 'rejected')->count();
        
        $this->info("💡 PLACEMENT RECOMMENDATIONS");
        $this->line("  Total: {$totalRecs}");
        $this->line("  Pending: {$pendingRecs}");
        $this->line("  Confirmed: {$confirmedRecs}");
        $this->line("  Rejected: {$rejectedRecs}");
        $this->newLine();

        // Check placements
        $totalPlacements = InternshipPlacement::count();
        $activePlacements = InternshipPlacement::where('status', 'active')->count();
        $completedPlacements = InternshipPlacement::where('status', 'completed')->count();
        
        $this->info("✅ PLACEMENTS");
        $this->line("  Total: {$totalPlacements}");
        $this->line("  Active: {$activePlacements}");
        $this->line("  Completed: {$completedPlacements}");
        $this->newLine();

        // Check for issues
        $this->info("🔍 POTENTIAL ISSUES");
        $issues = [];

        // Issue 1: Accepted applications without placements
        $acceptedWithoutPlacement = Application::where('status', 'accepted')
            ->whereDoesntHave('placement')
            ->count();
        
        if ($acceptedWithoutPlacement > 0) {
            $this->warn("  ⚠️  {$acceptedWithoutPlacement} accepted applications without placements");
            $issues[] = 'accepted_no_placement';
        }

        // Issue 2: Pending recommendations
        if ($pendingRecs > 0) {
            $this->line("  ℹ️  {$pendingRecs} placement recommendations waiting for confirmation");
        }

        // Issue 3: Students with multiple active placements
        $multiPlaced = StudentProfile::whereHas('placements', function ($q) {
            $q->where('status', 'active');
        }, '>', 1)->count();
        
        if ($multiPlaced > 0) {
            $this->error("  ❌ {$multiPlaced} students with MULTIPLE active placements (invalid!)");
            $issues[] = 'multiple_placements';
        }

        // Issue 4: Placements without valid posting
        $invalidPlacements = InternshipPlacement::whereDoesntHave('internshipPosting')->count();
        if ($invalidPlacements > 0) {
            $this->error("  ❌ {$invalidPlacements} placements with missing/invalid posting");
            $issues[] = 'invalid_posting';
        }

        // Issue 5: Placements without valid student
        $orphanedPlacements = InternshipPlacement::whereDoesntHave('studentProfile')->count();
        if ($orphanedPlacements > 0) {
            $this->error("  ❌ {$orphanedPlacements} placements with missing/invalid student");
            $issues[] = 'orphaned_placement';
        }

        if (empty($issues)) {
            $this->info("  ✅ No critical issues found!");
        }

        $this->newLine();

        // Show sample data
        if ($totalPlacements > 0) {
            $this->info("📄 SAMPLE PLACEMENTS");
            $placements = InternshipPlacement::with([
                'studentProfile.user',
                'internshipPosting.companyProfile'
            ])->limit(5)->get();

            foreach ($placements as $placement) {
                $studentName = $placement->studentProfile->user->name ?? 'Unknown';
                $companyName = $placement->internshipPosting->companyProfile->company_name ?? 'Unknown';
                $status = $placement->status;
                
                $this->line("  ID: {$placement->id} | {$studentName} → {$companyName} | Status: {$status}");
            }
            $this->newLine();
        }

        // Show pending recommendations
        if ($pendingRecs > 0) {
            $this->info("⏳ PENDING RECOMMENDATIONS");
            $recs = PlacementRecommendation::with([
                'studentProfile.user',
                'internshipPosting.companyProfile'
            ])->where('status', 'pending')->limit(5)->get();

            foreach ($recs as $rec) {
                $studentName = $rec->studentProfile->user->name ?? 'Unknown';
                $companyName = $rec->internshipPosting->companyProfile->company_name ?? 'Unknown';
                
                $this->line("  ID: {$rec->id} | {$studentName} → {$companyName}");
            }
            $this->newLine();
        }

        // Show accepted applications without placement
        if ($acceptedWithoutPlacement > 0) {
            $this->info("⚠️  ACCEPTED APPLICATIONS WITHOUT PLACEMENT");
            $apps = Application::with([
                'studentProfile.user',
                'internshipPosting.companyProfile'
            ])
            ->where('status', 'accepted')
            ->whereDoesntHave('placement')
            ->limit(5)
            ->get();

            foreach ($apps as $app) {
                $studentName = $app->studentProfile->user->name ?? 'Unknown';
                $companyName = $app->internshipPosting->companyProfile->company_name ?? 'Unknown';
                
                $this->warn("  App ID: {$app->id} | {$studentName} → {$companyName}");
                $this->line("    Accepted: {$app->reviewed_at}");
                $this->line("    ℹ️  Coordinator needs to confirm placement or create recommendation");
            }
            $this->newLine();
        }

        $this->info("✨ Check complete!");
        
        return self::SUCCESS;
    }
}
