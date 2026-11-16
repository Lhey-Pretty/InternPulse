<?php

namespace App\Services;

use App\Models\JournalEntry;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class JournalClassificationService
{
    /**
     * Submit journal entry to ML service for classification.
     * This is a fire-and-forget async call - we don't wait for the result.
     * The ML service will callback to our API endpoint with the classification result.
     */
    public static function classifyJournalEntry(JournalEntry $journalEntry): void
    {
        try {
            $student = $journalEntry->studentProfile;
            
            if (! $student || ! $student->course_code) {
                Log::warning("Cannot classify journal {$journalEntry->id}: missing student course code");
                return;
            }

            $mlServiceUrl = config('services.ml.url', env('ML_SERVICE_URL', 'http://127.0.0.1:8001'));
            
            // Combine title + content for classification
            $fullText = trim($journalEntry->title . '. ' . $journalEntry->content);
            
            Http::timeout(5)->post("{$mlServiceUrl}/api/journal/analyze", [
                'journal_entry_id' => $journalEntry->id,
                'journal_text' => $fullText,
                'student_course' => $student->course_code,
                'callback_url' => route('api.journal-classification.store'),
            ]);
            
            Log::info("Submitted journal {$journalEntry->id} for ML classification", [
                'course' => $student->course_code,
            ]);
        } catch (\Exception $e) {
            // Don't fail journal creation if ML service is down
            Log::error("Failed to submit journal {$journalEntry->id} for classification: {$e->getMessage()}");
        }
    }

    /**
     * Get classification statistics for a company.
     * Used by coordinators to assess company partnership quality.
     */
    public static function getCompanyStatistics(int $companyId): array
    {
        $journalEntries = \DB::table('journal_entries as je')
            ->join('internship_placements as ip', 'je.internship_placement_id', '=', 'ip.id')
            ->join('internship_postings as posting', 'ip.internship_posting_id', '=', 'posting.id')
            ->where('posting.company_profile_id', $companyId)
            ->select([
                \DB::raw('COUNT(*) as total'),
                \DB::raw('SUM(CASE WHEN je.classification_result IS NOT NULL THEN 1 ELSE 0 END) as classified'),
                \DB::raw('SUM(CASE WHEN je.is_related IS TRUE OR je.is_related = 1 THEN 1 ELSE 0 END) as related'),
                \DB::raw('SUM(CASE WHEN je.is_related IS FALSE OR je.is_related = 0 THEN 1 ELSE 0 END) as unrelated'),
                \DB::raw('SUM(CASE WHEN je.flag_level IN ("Warning - Errand / Administrative", "Unrelated") THEN 1 ELSE 0 END) as flagged'),
            ])
            ->first();

        if (! $journalEntries || $journalEntries->total == 0) {
            return [
                'total_entries' => 0,
                'classified_entries' => 0,
                'related_entries' => 0,
                'unrelated_entries' => 0,
                'flagged_entries' => 0,
                'unrelated_percentage' => 0,
                'needs_review' => false,
            ];
        }

        // Convert to integers to avoid type issues
        $total = (int) $journalEntries->total;
        $classified = (int) $journalEntries->classified;
        $related = (int) $journalEntries->related;
        $unrelated = (int) $journalEntries->unrelated;
        $flagged = (int) $journalEntries->flagged;

        $unrelatedPercentage = $total > 0 
            ? round(($unrelated / $total) * 100, 2) 
            : 0;

        // Flag company if >30% of journals are unrelated AND at least 10 entries classified
        $needsReview = $unrelatedPercentage > 30 && $classified >= 10;

        return [
            'total_entries' => $total,
            'classified_entries' => $classified,
            'related_entries' => $related,
            'unrelated_entries' => $unrelated,
            'flagged_entries' => $flagged,
            'unrelated_percentage' => $unrelatedPercentage,
            'needs_review' => $needsReview,
        ];
    }
}
