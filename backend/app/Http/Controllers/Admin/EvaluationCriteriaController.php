<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\EvaluationCriterion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EvaluationCriteriaController extends Controller
{
    /**
     * Get all evaluation criteria filtered by type (student or company).
     */
    public function index(Request $request): JsonResponse
    {
        $type = $request->input('type', 'student'); // default to student
        
        $criteria = EvaluationCriterion::where('type', $type)
            ->orderBy('order')
            ->get();
        
        return response()->json([
            'success' => true,
            'message' => 'Evaluation criteria retrieved.',
            'data' => $criteria,
        ]);
    }

    /**
     * Get a single criterion.
     */
    public function show(EvaluationCriterion $criterion): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => 'Criterion retrieved.',
            'data' => $criterion,
        ]);
    }

    /**
     * Update an existing criterion.
     */
    public function update(Request $request, EvaluationCriterion $criterion): JsonResponse
    {
        abort_if(! $request->user()?->isAdmin(), 403);

        $validated = $request->validate([
            'label' => 'required|string|max:255',
            'description' => 'nullable|string',
            'order' => 'required|integer|min:1',
            'is_active' => 'required|boolean',
        ]);

        $criterion->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Criterion updated successfully.',
            'data' => $criterion->fresh(),
        ]);
    }

    /**
     * Reorder criteria within the same type.
     */
    public function reorder(Request $request): JsonResponse
    {
        abort_if(! $request->user()?->isAdmin(), 403);

        $validated = $request->validate([
            'type' => 'required|in:student,company',
            'criteria' => 'required|array',
            'criteria.*.id' => 'required|exists:evaluation_criteria,id',
            'criteria.*.order' => 'required|integer|min:1',
        ]);

        foreach ($validated['criteria'] as $item) {
            EvaluationCriterion::where('id', $item['id'])
                ->where('type', $validated['type']) // ensure same type
                ->update(['order' => $item['order']]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Criteria reordered successfully.',
        ]);
    }

    /**
     * Toggle active status.
     */
    public function toggleStatus(Request $request, EvaluationCriterion $criterion): JsonResponse
    {
        abort_if(! $request->user()?->isAdmin(), 403);

        $criterion->update(['is_active' => !$criterion->is_active]);

        return response()->json([
            'success' => true,
            'message' => $criterion->is_active ? 'Criterion activated.' : 'Criterion deactivated.',
            'data' => $criterion,
        ]);
    }
}
