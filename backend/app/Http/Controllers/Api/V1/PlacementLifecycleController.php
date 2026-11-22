<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\AttendanceLog;
use App\Models\StudentProfile;
use App\Services\PlacementLifecycleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PlacementLifecycleController extends ApiController
{
    public function transfer(Request $request, StudentProfile $studentProfile, ?int $sourceId = null): JsonResponse
    {
        app(PlacementLifecycleService::class)->authorize($request->user(), $studentProfile);
        $validated = $request->validate([
            'source_placement_id' => [$sourceId ? 'nullable' : 'required', 'integer', 'min:1'],
            'new_company_id' => ['required', 'integer', 'min:1'],
            'new_posting_id' => ['required', 'integer', 'min:1'],
            'reason' => ['required', 'string', 'max:1000'],
            'last_working_date' => ['required', 'date_format:Y-m-d'],
            'start_date' => ['required', 'date_format:Y-m-d'],
            'end_date' => ['required', 'date_format:Y-m-d', 'after_or_equal:start_date'],
            'acceptance_confirmed' => ['required', 'accepted'],
        ]);
        $result = app(PlacementLifecycleService::class)->transition($request->user(), $studentProfile, $validated, false,
            $sourceId ?? $validated['source_placement_id']);

        return $this->ok('Student deployment updated. Previous records and credits are preserved.', $result);
    }

    public function pullOut(Request $request, StudentProfile $studentProfile): JsonResponse
    {
        app(PlacementLifecycleService::class)->authorize($request->user(), $studentProfile);
        $validated = $request->validate([
            'source_placement_id' => ['required', 'integer', 'min:1'],
            'reason' => ['required', 'string', 'max:1000'],
            'last_working_date' => ['required', 'date_format:Y-m-d'],
        ]);
        $result = app(PlacementLifecycleService::class)->transition($request->user(), $studentProfile, $validated, true,
            $validated['source_placement_id']);

        return $this->ok('Student pulled out. Credits are preserved while awaiting redeployment.', $result);
    }

    public function attendance(Request $request, StudentProfile $studentProfile): JsonResponse
    {
        app(PlacementLifecycleService::class)->authorize($request->user(), $studentProfile);
        $validated = $request->validate(['placement_id' => ['required', 'integer', 'min:1']]);
        $placement = $studentProfile->placements()->findOrFail($validated['placement_id']);

        return $this->ok('Deployment attendance retrieved.', $placement->attendanceLogs()->orderByDesc('date')->paginate($this->perPage($request)));
    }

    public function reviewAttendance(Request $request, AttendanceLog $attendanceLog): JsonResponse
    {
        app(PlacementLifecycleService::class)->authorize($request->user(), $attendanceLog->studentProfile);
        $validated = $request->validate([
            'decision' => ['required', 'in:approved,rejected'],
            'reason' => ['required', 'string', 'max:1000'],
            'time_out' => ['nullable', 'date_format:H:i'],
        ]);

        return $this->ok('Attendance review saved.', app(PlacementLifecycleService::class)
            ->reviewAttendance($request->user(), $attendanceLog, $validated));
    }
}
