<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\JournalEntry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class JournalClassificationController extends Controller
{
    /**
     * Store classification results from ML service.
     *
     * Expected request body:
     * {
     *   "journal_entry_id": 123,
     *   "classification_result": "course_related|errand|unrelated",
     *   "is_related": true|false,
     *   "confidence_score": 0.85,
     *   "detected_tasks": ["coding", "debugging"],
     *   "flag_level": "Normal|Warning - Errand / Administrative|Unrelated",
     *   "feedback": "Activities are clearly aligned with curriculum..."
     * }
     */
    public function store(Request $request): JsonResponse
    {
        $callbackToken = (string) config('services.ml.callback_token');
        abort_unless(
            $callbackToken !== '' && hash_equals($callbackToken, (string) $request->header('X-ML-Callback-Token')),
            401,
            'Invalid ML callback credentials.'
        );

        $validated = $request->validate([
            'journal_entry_id' => ['required', 'integer', 'exists:journal_entries,id'],
            'classification_result' => ['nullable', 'string', 'max:100'],
            'is_related' => ['required', 'boolean'],
            'confidence_score' => ['nullable', 'numeric', 'min:0', 'max:1'],
            'detected_tasks' => ['nullable', 'array'],
            'detected_tasks.*' => ['string'],
            'flag_level' => ['nullable', 'string', 'max:100'],
            'feedback' => ['nullable', 'string', 'max:1000'],
        ]);

        try {
            $journalEntry = JournalEntry::findOrFail($validated['journal_entry_id']);

            $journalEntry->update([
                'classification_result' => $validated['classification_result'] ?? null,
                'is_related' => $validated['is_related'],
                'confidence_score' => $validated['confidence_score'] ?? null,
                'detected_tasks' => $validated['detected_tasks'] ?? [],
                'flag_level' => $validated['flag_level'] ?? 'Normal',
                'classification_feedback' => $validated['feedback'] ?? null,
            ]);

            Log::info("Journal classification saved for entry {$journalEntry->id}", [
                'is_related' => $validated['is_related'],
                'flag_level' => $validated['flag_level'] ?? 'Normal',
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Classification result saved successfully.',
                'journal_entry_id' => $journalEntry->id,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to save journal classification', [
                'journal_entry_id' => $validated['journal_entry_id'],
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to save classification result.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get classification statistics for a specific placement or company.
     */
    public function statistics(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'placement_id' => ['nullable', 'integer', 'exists:internship_placements,id'],
            'company_id' => ['nullable', 'integer', 'exists:company_profiles,id'],
        ]);

        $query = JournalEntry::query();
        $user = $request->user();

        if (! $user?->isAdmin() && ! $user?->isCoordinator()) {
            abort_if(! $user, 401);

            if ($user->isCompany() && $user->companyProfile) {
                abort_if(isset($validated['company_id']) && (int) $validated['company_id'] !== $user->companyProfile->id, 403);
                $query->whereHas('internshipPlacement.internshipPosting', fn ($q) => $q
                    ->where('company_profile_id', $user->companyProfile->id));
            } elseif ($user->isStudent() && $user->studentProfile) {
                abort_if(isset($validated['company_id']), 403);
                $query->where('student_profile_id', $user->studentProfile->id);
            } else {
                abort(403);
            }
        }

        if (isset($validated['placement_id'])) {
            $query->where('internship_placement_id', $validated['placement_id']);
        }

        if (isset($validated['company_id'])) {
            $query->whereHas('internshipPlacement.internshipPosting', function ($q) use ($validated) {
                $q->where('company_profile_id', $validated['company_id']);
            });
        }

        $total = $query->count();
        $classified = $query->whereNotNull('classification_result')->count();
        $related = $query->where('is_related', true)->count();
        $unrelated = $query->where('is_related', false)->count();
        
        $flagged = $query->whereIn('flag_level', [
            'Warning - Errand / Administrative',
            'Unrelated',
        ])->count();

        $unrelatedPercentage = $total > 0 ? round(($unrelated / $total) * 100, 2) : 0;

        return response()->json([
            'total_entries' => $total,
            'classified_entries' => $classified,
            'related_entries' => $related,
            'unrelated_entries' => $unrelated,
            'flagged_entries' => $flagged,
            'unrelated_percentage' => $unrelatedPercentage,
        ]);
    }
}
