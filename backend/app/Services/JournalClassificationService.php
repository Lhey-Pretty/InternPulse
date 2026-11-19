<?php

namespace App\Services;

use App\Models\JournalEntry;
use App\Jobs\ClassifyJournalEntry;
use App\Support\AcademicPrograms;
use Illuminate\Support\Facades\Log;

class JournalClassificationService
{
    /**
     * Submit journal entry to ML service for classification.
     * Queue the ML request so journal saves stay responsive. The worker retries
     * transient failures and the callback marks the result as completed.
     */
    public static function classifyJournalEntry(JournalEntry $journalEntry): void
    {
        JournalEntry::whereKey($journalEntry->getKey())->update([
            'classification_status' => 'pending',
            'classification_result' => null,
            'confidence_score' => null,
            'classification_feedback' => null,
        ]);

        try {
            ClassifyJournalEntry::dispatch($journalEntry->getKey());
        } catch (\Throwable $exception) {
            JournalEntry::whereKey($journalEntry->getKey())->update([
                'classification_status' => 'failed',
                'classification_feedback' => 'Classification could not be queued; coordinator review is required.',
            ]);
            Log::error("Could not queue journal classification for entry {$journalEntry->getKey()}.", [
                'error' => $exception->getMessage(),
            ]);
        }
    }

    /**
     * Get classification statistics for a company.
     * Used by coordinators to assess company partnership quality.
     */
    public static function getCompanyStatistics(int $companyId, ?string $program = null): array
    {
        $journalEntries = \DB::table('journal_entries as je')
            ->join('internship_placements as ip', 'je.internship_placement_id', '=', 'ip.id')
            ->join('internship_postings as posting', 'ip.internship_posting_id', '=', 'posting.id')
            ->join('student_profiles as sp', 'je.student_profile_id', '=', 'sp.id')
            ->where('posting.company_profile_id', $companyId)
            ->when($program, fn ($q) => self::whereProgram($q, $program))
            ->select([
                \DB::raw('COUNT(*) as total'),
                \DB::raw('COUNT(DISTINCT je.student_profile_id) as students'),
                \DB::raw("SUM(CASE WHEN je.classification_result IS NOT NULL OR je.classification_status = 'completed' THEN 1 ELSE 0 END) as classified"),
                \DB::raw("SUM(CASE WHEN (je.classification_result IS NOT NULL OR je.classification_status = 'completed') AND je.is_related = 1 THEN 1 ELSE 0 END) as related"),
                \DB::raw("SUM(CASE WHEN (je.classification_result IS NOT NULL OR je.classification_status = 'completed') AND je.is_related = 0 THEN 1 ELSE 0 END) as unrelated"),
                \DB::raw("SUM(CASE WHEN je.classification_status != 'completed' AND je.classification_result IS NULL THEN 1 ELSE 0 END) as unclassified"),
                \DB::raw("SUM(CASE WHEN (je.classification_result IS NOT NULL OR je.classification_status = 'completed') AND je.flag_level IN ('Warning - Errand / Administrative', 'Unrelated') THEN 1 ELSE 0 END) as flagged"),
            ])
            ->first();

        return self::formatCompanyStatistics($journalEntries);
    }

    /** Aggregate many companies in one query to keep the dashboard from doing N+1 queries. */
    public static function getCompanyStatisticsForCompanies(array $companyIds, ?string $program = null): array
    {
        if ($companyIds === []) {
            return [];
        }

        $rows = \DB::table('journal_entries as je')
            ->join('internship_placements as ip', 'je.internship_placement_id', '=', 'ip.id')
            ->join('internship_postings as posting', 'ip.internship_posting_id', '=', 'posting.id')
            ->join('student_profiles as sp', 'je.student_profile_id', '=', 'sp.id')
            ->whereIn('posting.company_profile_id', $companyIds)
            ->when($program, fn ($q) => self::whereProgram($q, $program))
            ->selectRaw('posting.company_profile_id as company_id')
            ->selectRaw('COUNT(*) as total')
            ->selectRaw('COUNT(DISTINCT je.student_profile_id) as students')
            ->selectRaw("SUM(CASE WHEN je.classification_result IS NOT NULL OR je.classification_status = 'completed' THEN 1 ELSE 0 END) as classified")
            ->selectRaw("SUM(CASE WHEN (je.classification_result IS NOT NULL OR je.classification_status = 'completed') AND je.is_related = 1 THEN 1 ELSE 0 END) as related")
            ->selectRaw("SUM(CASE WHEN (je.classification_result IS NOT NULL OR je.classification_status = 'completed') AND je.is_related = 0 THEN 1 ELSE 0 END) as unrelated")
            ->selectRaw("SUM(CASE WHEN je.classification_status != 'completed' AND je.classification_result IS NULL THEN 1 ELSE 0 END) as unclassified")
            ->selectRaw("SUM(CASE WHEN (je.classification_result IS NOT NULL OR je.classification_status = 'completed') AND je.flag_level IN (?, ?) THEN 1 ELSE 0 END) as flagged", ['Warning - Errand / Administrative', 'Unrelated'])
            ->groupBy('posting.company_profile_id')
            ->get()
            ->keyBy('company_id');

        $statistics = [];
        foreach ($companyIds as $companyId) {
            $statistics[$companyId] = self::formatCompanyStatistics($rows->get($companyId));
        }

        return $statistics;
    }

    private static function formatCompanyStatistics(?object $journalEntries): array
    {
        if (! $journalEntries) {
            return [
                'total_entries' => 0,
                'classified_entries' => 0,
                'related_entries' => 0,
                'unrelated_entries' => 0,
                'flagged_entries' => 0,
                'unclassified_entries' => 0,
                'students_count' => 0,
                'related_percentage' => 0,
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
        $unclassified = (int) $journalEntries->unclassified;
        $students = (int) $journalEntries->students;

        $relatedPercentage = $classified > 0
            ? round(($related / $classified) * 100, 2)
            : 0;
        $unrelatedPercentage = $classified > 0
            ? round(($unrelated / $classified) * 100, 2)
            : 0;

        // Flag company if >30% of journals are unrelated AND at least 10 entries classified
        $needsReview = $unrelatedPercentage > 30 && $classified >= 10;

        return [
            'total_entries' => $total,
            'classified_entries' => $classified,
            'related_entries' => $related,
            'unrelated_entries' => $unrelated,
            'flagged_entries' => $flagged,
            'unclassified_entries' => $unclassified,
            'students_count' => $students,
            'related_percentage' => $relatedPercentage,
            'unrelated_percentage' => $unrelatedPercentage,
            'needs_review' => $needsReview,
        ];
    }

    private static function whereProgram($query, string $program): void
    {
        if (! isset(AcademicPrograms::PROGRAMS[$program])) {
            return;
        }

        $values = array_values(array_unique([$program, ...AcademicPrograms::PROGRAMS[$program]]));
        $query->where(fn ($q) => $q->whereIn('sp.program', $values)->orWhereIn('sp.course', $values));
    }
}
