<?php

namespace App\Console\Commands;

use App\Services\CompanyEligibilityReviewService;
use Illuminate\Console\Command;

class ReviewCompanyEligibility extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'internpulse:review-company-eligibility 
                            {--company= : Review a specific company by ID}
                            {--dry-run : Show what would be changed without saving}';

    /**
     * The console command description.
     */
    protected $description = 'Review company eligibility based on journal classification ML results';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('Starting company eligibility review based on journal classification...');
        $this->newLine();

        if ($this->option('dry-run')) {
            $this->warn('🔍 DRY RUN MODE - No changes will be saved');
            $this->newLine();
        }

        if ($companyId = $this->option('company')) {
            return $this->reviewSingleCompany((int) $companyId);
        }

        return $this->reviewAllCompanies();
    }

    private function reviewSingleCompany(int $companyId): int
    {
        $company = \App\Models\CompanyProfile::find($companyId);

        if (!$company) {
            $this->error("Company with ID {$companyId} not found.");
            return self::FAILURE;
        }

        $this->info("Reviewing company: {$company->company_name}");
        $this->newLine();

        $result = CompanyEligibilityReviewService::reviewCompany($company);

        if (!$result['reviewed']) {
            $this->warn($result['reason']);
            return self::SUCCESS;
        }

        $stats = $result['stats'];
        
        $this->table(
            ['Metric', 'Value'],
            [
                ['Total Journal Entries', $stats['total_entries']],
                ['Classified Entries', $stats['classified_entries']],
                ['Related Entries', $stats['related_entries']],
                ['Unrelated Entries', $stats['unrelated_entries']],
                ['Flagged Entries', $stats['flagged_entries']],
                ['Unrelated %', number_format($stats['unrelated_percentage'], 1) . '%'],
                ['Needs Review', $stats['needs_review'] ? 'YES' : 'NO'],
            ]
        );

        $this->newLine();

        if ($result['action'] === 'flagged') {
            $this->warn("⚠️  Company eligibility status changed: {$result['previous_status']} → {$result['new_status']}");
            $this->line("   Reason: High percentage of unrelated journal entries");
        } elseif ($result['action'] === 'cleared') {
            $this->info("✓ Company eligibility status changed: {$result['previous_status']} → {$result['new_status']}");
            $this->line("   Reason: Journal quality improved");
        } else {
            $this->info("✓ No status change needed (current: {$result['new_status']})");
        }

        return self::SUCCESS;
    }

    private function reviewAllCompanies(): int
    {
        $results = CompanyEligibilityReviewService::reviewAllCompanies();

        $this->info("✓ Review completed");
        $this->newLine();

        $this->table(
            ['Summary', 'Count'],
            [
                ['Companies Reviewed', $results['reviewed']],
                ['Companies Flagged', $results['flagged']],
            ]
        );

        if (!empty($results['results'])) {
            $this->newLine();
            $this->info('Details:');
            $this->newLine();

            foreach ($results['results'] as $result) {
                $icon = $result['action'] === 'flagged' ? '⚠️' : '✓';
                $action = $result['action'] === 'flagged' ? 'FLAGGED' : 'CLEARED';
                
                $this->line(sprintf(
                    '%s %s: %s (%.1f%% unrelated, %d/%d entries)',
                    $icon,
                    $action,
                    $result['company_name'],
                    $result['stats']['unrelated_percentage'],
                    $result['stats']['unrelated_entries'],
                    $result['stats']['total_entries']
                ));
            }
        }

        $this->newLine();
        $this->info('Review process completed successfully.');

        return self::SUCCESS;
    }
}
