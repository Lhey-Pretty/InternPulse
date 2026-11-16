<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\InternshipPosting;
use App\Services\MLService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StudentRecommendationController extends ApiController
{
    public function index(Request $request, MLService $mlService): JsonResponse
    {
        $user = $request->user();
        $student = $user?->studentProfile;

        if (! $user?->isStudent() || ! $student) {
            return $this->error('Complete your student profile before requesting recommendations.', 403);
        }

        $postings = InternshipPosting::with('companyProfile')
            ->where('status', 'approved')
            ->where(fn ($query) => $query->whereNull('application_deadline')
                ->orWhere('application_deadline', '>=', now()->toDateString()))
            ->where(function ($query) {
                $query->whereNull('slots')
                    ->orWhere('slots', '>', 0);
            })
            ->get();

        if ($postings->isEmpty()) {
            return $this->ok('No eligible internship postings are available.', [
                'analysis_status' => 'completed',
                'recommendations' => [],
                'total_evaluated' => 0,
            ]);
        }

        $studentSkills = $student->skills->pluck('name')->values()->all();

        $payload = $postings->map(fn ($posting) => [
            'id' => $posting->id,
            'title' => $posting->title,
            'company_name' => $posting->companyProfile?->company_name,
            'required_course' => $posting->required_course,
            'required_skills' => $posting->required_skills ?? [],
            'location' => $posting->location,
            'is_remote' => $posting->work_setup === 'remote',
        ])->all();

        $result = $mlService->recommendInternships(
            $student->course,
            $studentSkills,
            $payload,
            min(10, max(1, (int) $request->input('limit', 5))),
        );

        if (($result['analysis_status'] ?? null) !== 'completed') {
            return $this->error([
                [
                    'status' => 503,
                    'message' => $result['message'] ?? 'Recommendation service is unavailable.',
                    'source' => 'ml_service',
                ],
            ]);
        }

        return $this->ok('Recommendations generated successfully.', [
            'analysis_status' => 'completed',
            'student_course' => $student->course,
            'total_evaluated' => $result['total_evaluated'],
            'recommendations' => $result['recommendations'],
        ]);
    }
}
