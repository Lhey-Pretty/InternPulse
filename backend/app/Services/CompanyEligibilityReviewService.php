<?php

namespace App\Services;

use App\Models\CompanyProfile;
use Illuminate\Support\Facades\Log;

class CompanyEligibilityReviewService
{
    /**
     * Review all companies and automatically flag those with poor journal quality.
     * This should be run periodically (e.g., via scheduled command).
     * 
     * Criteria for automatic flagging:
     * - More than 30% of journal entries are classified as unrelated
     * - At least 10 classified entries (to avoid false positives from small samples)
     */
    public static function reviewAllCompanies(): array
    {
        $companies = CompanyProfile::whereHas('internshipPostings.placements', function ($query) {
            $query->whereIn('status', ['active', 'completed']);
        })->get();

        $flaggedCount = 0;
        $reviewedCount = 0;
        $results = [];

        foreach ($companies as $company) {
            $stats = JournalClassificationService::getCompanyStatistics($company->id);
            
            // Skip companies without enough data
            if ($stats['classified_entries'] < 10) {
                continue;
            }

            $reviewedCount++;
            $shouldFlag = $stats['needs_review'];
            $previousStatus = $company->eligibility_status;

            // Auto-flag companies with high unrelated percentage
            if ($shouldFlag && in_array($previousStatus, ['eligible', 'pending'])) {
                $company->update([
                    'eligibility_status' => 'needs_review',
                    'eligibility_notes' => sprintf(
                        'Automatically flagged by ML system: %.1f%% of journal entries (%d/%d) are unrelated to coursework. ' .
                        'Students may be performing errands rather than meaningful internship tasks. Manual review required.',
                        $stats['unrelated_percentage'],
                        $stats['unrelated_entries'],
                        $stats['total_entries']
                    ),
                ]);

                $flaggedCount++;
                
                Log::info("Auto-flagged company {$company->id} ({$company->company_name}) for eligibility review", [
                    'unrelated_percentage' => $stats['unrelated_percentage'],
                    'unrelated_entries' => $stats['unrelated_entries'],
                    'total_entries' => $stats['total_entries'],
                ]);

                $results[] = [
                    'company_id' => $company->id,
                    'company_name' => $company->company_name,
                    'action' => 'flagged',
                    'stats' => $stats,
                ];
            } 
            // Clear flag if company improved (was needs_review but now has good stats)
            elseif (!$shouldFlag && $previousStatus === 'needs_review' && $stats['unrelated_percentage'] < 15) {
                $company->update([
                    'eligibility_status' => 'eligible',
                    'eligibility_notes' => sprintf(
                        'Auto-cleared by ML system: Journal quality improved to %.1f%% unrelated (was flagged previously). ' .
                        'Manual review recommended before final approval.',
                        $stats['unrelated_percentage']
                    ),
                ]);

                Log::info("Auto-cleared company {$company->id} ({$company->company_name}) eligibility flag", [
                    'unrelated_percentage' => $stats['unrelated_percentage'],
                ]);

                $results[] = [
                    'company_id' => $company->id,
                    'company_name' => $company->company_name,
                    'action' => 'cleared',
                    'stats' => $stats,
                ];
            }
        }

        return [
            'reviewed' => $reviewedCount,
            'flagged' => $flaggedCount,
            'results' => $results,
        ];
    }

    /**
     * Check a single company and update eligibility status if needed.
     */
    public static function reviewCompany(CompanyProfile $company): array
    {
        $stats = JournalClassificationService::getCompanyStatistics($company->id);
        
        if ($stats['classified_entries'] < 10) {
            return [
                'reviewed' => false,
                'reason' => 'Insufficient data (minimum 10 classified entries required)',
                'stats' => $stats,
            ];
        }

        $shouldFlag = $stats['needs_review'];
        $previousStatus = $company->eligibility_status;
        $action = 'no_change';

        if ($shouldFlag && in_array($previousStatus, ['eligible', 'pending'])) {
            $company->update([
                'eligibility_status' => 'needs_review',
                'eligibility_notes' => sprintf(
                    'Flagged by ML system: %.1f%% of journal entries are unrelated to coursework.',
                    $stats['unrelated_percentage']
                ),
            ]);
            $action = 'flagged';
        } elseif (!$shouldFlag && $previousStatus === 'needs_review' && $stats['unrelated_percentage'] < 15) {
            $company->update([
                'eligibility_status' => 'eligible',
                'eligibility_notes' => sprintf(
                    'Journal quality improved to %.1f%% unrelated.',
                    $stats['unrelated_percentage']
                ),
            ]);
            $action = 'cleared';
        }

        return [
            'reviewed' => true,
            'action' => $action,
            'previous_status' => $previousStatus,
            'new_status' => $company->eligibility_status,
            'stats' => $stats,
        ];
    }
}
