<?php

use Illuminate\Support\Facades\Schedule;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote')->hourly();

Schedule::command('passwords:notify-expiring')
    ->dailyAt('08:00')
    ->timezone('Asia/Manila')
    ->withoutOverlapping();

// Test command to check journal classification data
Artisan::command('test:journal-stats', function () {
    $this->info('Testing Journal Classification Statistics...');
    $this->newLine();
    
    // Test 1: Check if migration ran
    $columns = \DB::select("SHOW COLUMNS FROM journal_entries WHERE Field LIKE '%classification%' OR Field = 'is_related'");
    $this->info('✓ Classification columns exist: ' . count($columns));
    foreach ($columns as $col) {
        $this->line("  - {$col->Field} ({$col->Type})");
    }
    $this->newLine();
    
    // Test 2: Count journal entries
    $totalJournals = \DB::table('journal_entries')->count();
    $classifiedJournals = \DB::table('journal_entries')->whereNotNull('classification_result')->count();
    $this->info("✓ Total journal entries: {$totalJournals}");
    $this->info("✓ Classified entries: {$classifiedJournals}");
    $this->newLine();
    
    // Test 3: Check company-placement chain
    $companiesWithPlacements = \DB::table('company_profiles as cp')
        ->join('internship_postings as posting', 'cp.id', '=', 'posting.company_profile_id')
        ->join('internship_placements as ip', 'posting.id', '=', 'ip.internship_posting_id')
        ->select('cp.id', 'cp.company_name', \DB::raw('COUNT(ip.id) as placement_count'))
        ->groupBy('cp.id', 'cp.company_name')
        ->get();
    
    $this->info("✓ Companies with placements: {$companiesWithPlacements->count()}");
    foreach ($companiesWithPlacements as $company) {
        $this->line("  - {$company->company_name}: {$company->placement_count} placements");
    }
    $this->newLine();
    
    // Test 4: Check journals per company
    $companiesWithJournals = \DB::table('company_profiles as cp')
        ->join('internship_postings as posting', 'cp.id', '=', 'posting.company_profile_id')
        ->join('internship_placements as ip', 'posting.id', '=', 'ip.internship_posting_id')
        ->join('journal_entries as je', 'ip.id', '=', 'je.internship_placement_id')
        ->select('cp.id', 'cp.company_name', \DB::raw('COUNT(je.id) as journal_count'))
        ->groupBy('cp.id', 'cp.company_name')
        ->get();
    
    $this->info("✓ Companies with journals: {$companiesWithJournals->count()}");
    foreach ($companiesWithJournals as $company) {
        $stats = \App\Services\JournalClassificationService::getCompanyStatistics($company->id);
        $this->line("  - {$company->company_name}:");
        $this->line("      Total: {$stats['total_entries']}, Related: {$stats['related_entries']}, Unrelated: {$stats['unrelated_entries']} ({$stats['unrelated_percentage']}%)");
    }
    
    $this->newLine();
    $this->info('✓ Test complete!');
})->purpose('Test journal classification statistics');
