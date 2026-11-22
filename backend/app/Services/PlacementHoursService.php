<?php

namespace App\Services;

use App\Models\StudentProfile;

class PlacementHoursService
{
    public function summary(StudentProfile $student): array
    {
        $placements = $student->placements()->orderBy('id')->get();
        $required = (float) ($student->ojt_required_hours ?? $placements->first()?->required_hours ?? $student->required_hours);
        $rendered = round((float) $placements->sum('rendered_hours'), 2);

        return [
            'required_hours' => $required,
            'rendered_hours' => $rendered,
            'remaining_hours' => max(0, round($required - $rendered, 2)),
            'completion_percentage' => $required > 0 ? min(100, round($rendered / $required * 100, 1)) : 0,
            'awaiting_deployment' => $placements->isNotEmpty() && ! $placements->contains('status', 'active')
                && $placements->last()->status === 'pulled_out',
        ];
    }

    // Call under the student's row lock so approvals and transitions serialize.
    public function synchronize(StudentProfile $student): array
    {
        $placements = $student->placements()->orderBy('id')->lockForUpdate()->get();
        if ($placements->isNotEmpty() && $student->ojt_required_hours === null) {
            $student->update(['ojt_required_hours' => $placements->first()->required_hours]);
        }
        foreach ($placements as $placement) {
            $approved = $placement->attendanceLogs()
                ->whereNotNull('time_in_approved_at')->whereNotNull('time_out_approved_at')
                ->whereNotNull('time_out')->where(fn ($q) => $q->whereNull('review_decision')->orWhere('review_decision', 'approved'))
                ->sum('hours_rendered');
            $placement->update(['rendered_hours' => round((float) $placement->legacy_credited_hours + (float) $approved, 2)]);
        }
        $summary = $this->summary($student);
        foreach ($placements->where('status', 'active') as $active) {
            $priorCredits = (float) $summary['rendered_hours'] - (float) $active->fresh()->rendered_hours;
            $active->update(['required_hours' => max(0, round($summary['required_hours'] - $priorCredits, 2))]);
        }

        return $summary;
    }
}
