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
            });

        $totalEligible = (clone $postings)->count();
        if ($totalEligible === 0) {
            return $this->ok('No eligible internship postings are available.', [
                'analysis_status' => 'completed',
                'recommendations' => [],
                'total_evaluated' => 0,
            ]);
        }

        $studentSkills = $student->skills->pluck('name')->values()->all();
        $topK = min(10, max(1, (int) $request->input('limit', 5)));
        $recommendations = collect();
        $serviceError = null;

        // Keep request payloads bounded and retain only each batch's top results.
        $postings->chunkById(250, function ($batch) use ($mlService, $student, $studentSkills, $topK, &$recommendations, &$serviceError): bool {
            $payload = $batch->map(fn ($posting) => [
                'id' => $posting->id,
                'title' => $posting->title,
                'company_name' => $posting->companyProfile?->company_name,
                'required_course' => $posting->required_course,
                'required_skills' => $posting->required_skills ?? [],
                'location' => $posting->location,
                'is_remote' => $posting->work_setup === 'remote',
            ])->all();

            $result = $mlService->recommendInternships($student->course, $studentSkills, $payload, $topK);
            if (($result['analysis_status'] ?? null) !== 'completed') {
                $serviceError = $result['message'] ?? 'Recommendation service is unavailable.';

                return false;
            }

            $recommendations = $recommendations->concat($result['recommendations'] ?? [])
                ->sortByDesc('match_percentage')
                ->take($topK)
                ->values();

            return true;
        });

        if ($serviceError !== null) {
            return $this->error([
                [
                    'status' => 503,
                    'message' => $serviceError,
                    'source' => 'ml_service',
                ],
            ]);
        }

        $recommendations = $recommendations->values()->map(function (array $item, int $index): array {
            $item['rank'] = $index + 1;

            return $item;
        });

        return $this->ok('Recommendations generated successfully.', [
            'analysis_status' => 'completed',
            'student_course' => $student->course,
            'total_evaluated' => $totalEligible,
            'recommendations' => $recommendations,
        ]);
    }
}
