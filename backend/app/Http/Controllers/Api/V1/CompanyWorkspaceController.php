<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\Application;
use App\Models\AuditLog;
use App\Models\CompanyProfile;
use App\Models\InternshipPosting;
use App\Models\Notification;
use App\Models\PlacementRecommendation;
use App\Models\SystemSetting;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CompanyWorkspaceController extends ApiController
{
    public function postings(Request $request): JsonResponse
    {
        $company = $this->company($request);

        return $this->ok('Company postings retrieved successfully.', $company->internshipPostings()
            ->when($request->boolean('trashed'), fn ($query) => $query->onlyTrashed())
            ->withCount('applications')
            ->latest()
            ->paginate($this->perPage(request())));
    }

    public function storePosting(Request $request): JsonResponse
    {
        $company = $this->company($request);
        if (! $company->isVerified()) {
            return $this->error('Your company must be verified before posting internships.', 403);
        }

        $posting = $company->internshipPostings()->create($this->postingData($request));

        return $this->ok('Internship posting submitted for review.', $posting->fresh());
    }

    public function updatePosting(Request $request, InternshipPosting $posting): JsonResponse
    {
        $company = $this->company($request);
        $this->authorizePosting($company, $posting);

        $posting->update(array_merge($this->postingData($request), ['status' => 'pending']));

        return $this->ok('Internship posting updated and submitted for review.', $posting->fresh());
    }

    public function deletePosting(Request $request, InternshipPosting $posting): JsonResponse
    {
        $company = $this->company($request);
        $this->authorizePosting($company, $posting);

        if ($posting->status === 'approved' && $posting->applications()->exists()) {
            return $this->error('Cannot delete a posting that has applications.', 422);
        }

        DB::transaction(function () use ($posting): void {
            $posting->delete();
            AuditLog::record('internship_posting.deleted', $posting);
        });

        return $this->ok('Internship posting moved to Trash.');
    }

    public function restorePosting(Request $request, InternshipPosting $posting): JsonResponse
    {
        $company = $this->company($request);
        $this->authorizePosting($company, $posting, true);
        abort_unless($posting->trashed(), 422, 'This posting is not in Trash.');

        DB::transaction(function () use ($posting): void {
            $posting->restore();
            AuditLog::record('internship_posting.restored', $posting);
        });

        return $this->ok('Internship posting restored.', $posting->fresh());
    }

    public function applicants(Request $request): JsonResponse
    {
        $company = $this->company($request);
        $postingIds = $company->internshipPostings()->pluck('id');

        $applications = Application::with(['studentProfile.skills', 'internshipPosting'])
            ->whereIn('internship_posting_id', $postingIds)
            ->when($request->input('status'), fn ($query, $status) => $query->where('status', $status))
            ->when($request->input('posting_id'), fn ($query, $postingId) => $query->where('internship_posting_id', $postingId))
            ->when($request->input('search'), fn ($query, $search) => $query->whereHas('studentProfile', fn ($s) => $s
                ->where('first_name', 'like', "%{$search}%")
                ->orWhere('last_name', 'like', "%{$search}%")
                ->orWhere('student_id_number', 'like', "%{$search}%")))
            ->latest('applied_at')
            ->paginate($this->perPage(request()));

        // Calculate match scores on-the-fly for each application
        $applications->getCollection()->transform(function ($app) {
            $requiredSkills = array_map('strtolower', $app->internshipPosting->required_skills ?? []);
            $studentSkills = $app->studentProfile->skills
                ->pluck('name')
                ->map(fn ($n) => strtolower($n))
                ->toArray();

            $matched = array_intersect($requiredSkills, $studentSkills);
            $total = count($requiredSkills) ?: 1;

            $courseMatch = !$app->internshipPosting->required_course
                || stripos($app->studentProfile->course, $app->internshipPosting->required_course) !== false;

            $matchedCount = count($matched);
            $score = $matchedCount === 0
                ? 0
                : round(($matchedCount / $total) * 70 + ($courseMatch ? 30 : 0), 0);

            // Add computed match score
            $app->match_score = $score;
            $app->matched_skills_count = $matchedCount;
            $app->total_required_skills = count($requiredSkills);
            $app->course_match = $courseMatch;

            return $app;
        });

        return $this->ok('Applicants retrieved successfully.', $applications);
    }

    public function updateApplicantStatus(Request $request, Application $application): JsonResponse
    {
        $company = $this->company($request);
        $posting = $application->internshipPosting;
        $this->authorizePosting($company, $posting);

        $validated = $request->validate([
            'status' => ['required', 'in:shortlisted,interview,accepted,rejected'],
            'rejection_reason' => ['nullable', 'required_if:status,rejected', 'string', 'max:1000'],
            'interview_date' => ['nullable', 'required_if:status,interview', 'date'],
            'interview_time' => ['nullable', 'string'],
            'interview_location' => ['nullable', 'string', 'max:200'],
        ]);

        $application->update(array_merge($validated, ['reviewed_at' => now()]));
        Notification::send(
            $application->studentProfile->user_id,
            'application_status',
            'Application Update',
            "Your application for {$posting->title} is now {$validated['status']}."
        );

        return $this->ok('Application status updated successfully.', $application->fresh());
    }

    public function viewResume(Request $request, Application $application): StreamedResponse|JsonResponse
    {
        $company = $this->company($request);
        $postingIds = $company->internshipPostings()->pluck('id');
        abort_if(! $postingIds->contains($application->internship_posting_id), 403);

        $resumePath = $application->resume_path ?? $application->studentProfile->resume_path;
        abort_if(! $resumePath || ! Storage::disk('public')->exists($resumePath), 404, 'No resume on file.');

        return Storage::disk('public')->response($resumePath);
    }

    public function requestPlacement(Request $request, Application $application): JsonResponse
    {
        $company = $this->company($request);
        $postingIds = $company->internshipPostings()->pluck('id');
        abort_if(! $postingIds->contains($application->internship_posting_id), 403);
        abort_if($application->status !== 'accepted', 422, 'Application must be accepted before requesting a placement.');
        abort_if($application->placement()->exists(), 422, 'A placement already exists for this application.');
        abort_if($application->placementRecommendations()->where('status', 'pending')->exists(), 422, 'A placement is already awaiting coordinator approval.');

        $validated = $request->validate([
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after:start_date'],
            'required_hours' => ['required', 'integer', 'min:1'],
        ]);

        PlacementRecommendation::create([
            'student_profile_id' => $application->student_profile_id,
            'internship_posting_id' => $application->internship_posting_id,
            'application_id' => $application->id,
            'recommended_by' => $request->user()->id,
            'source' => 'company',
            'reason' => 'Placement date proposed by the company after accepting the application.',
            'requested_start_date' => $validated['start_date'],
            'requested_end_date' => $validated['end_date'],
            'requested_required_hours' => $validated['required_hours'],
            'status' => 'pending',
        ]);

        Notification::send(
            $application->studentProfile->user_id,
            'placement_recommendation',
            'Placement Awaiting Coordinator Approval',
            'The company proposed your OJT schedule. Your coordinator must approve it before your internship starts.'
        );

        return $this->ok('Placement request submitted for coordinator approval.', $application->fresh());
    }

    public function evaluationSummary(Request $request): JsonResponse
    {
        $company = $this->company($request);
        
        // Get all evaluations for interns at this company
        $evaluations = Evaluation::whereHas('internshipPlacement.internshipPosting', function ($q) use ($company) {
            $q->where('company_profile_id', $company->id);
        })->get();
        
        if ($evaluations->isEmpty()) {
            return $this->ok('No evaluations found.', [
                'total_evaluations' => 0,
                'total_interns_evaluated' => 0,
                'average_overall_rating' => 0,
                'average_equivalent_rating' => 0,
                'highest_overall_rating' => 0,
                'grade_description' => null,
                'criteria_averages' => [],
            ]);
        }
        
        $criteria = Evaluation::criteriaFields();
        $criteriaAverages = [];
        
        foreach ($criteria as $field) {
            $values = $evaluations->pluck($field)->filter()->values();
            $criteriaAverages[$field] = $values->isNotEmpty() ? round($values->avg(), 2) : 0;
        }
        
        $avgOverall = round($evaluations->avg('overall_rating'), 2);
        $avgEquivalent = round($evaluations->avg('equivalent_rating'), 2);
        $highest = $evaluations->max('overall_rating');
        $internsEvaluated = $evaluations->pluck('student_profile_id')->unique()->count();
        
        // Determine grade description based on average equivalent rating
        $gradeDescription = match (true) {
            $avgEquivalent >= 96 => 'Excellent',
            $avgEquivalent >= 90 => 'Very Satisfactory',
            $avgEquivalent >= 84 => 'Satisfactory',
            $avgEquivalent >= 78 => 'Needs Improvement',
            default => 'Poor',
        };
        
        return $this->ok('Evaluation summary retrieved.', [
            'total_evaluations' => $evaluations->count(),
            'total_interns_evaluated' => $internsEvaluated,
            'average_overall_rating' => $avgOverall,
            'average_equivalent_rating' => $avgEquivalent,
            'highest_overall_rating' => $highest,
            'grade_description' => $gradeDescription,
            'criteria_averages' => $criteriaAverages,
        ]);
    }

    private function company(Request $request): CompanyProfile
    {
        abort_if(! $request->user()?->isCompany() || ! $request->user()->companyProfile, 403);

        return $request->user()->companyProfile;
    }

    private function authorizePosting(CompanyProfile $company, InternshipPosting $posting, bool $allowTrashed = false): void
    {
        abort_if($posting->company_profile_id !== $company->id, 403);
        abort_if(! $allowTrashed && $posting->trashed(), 404);
    }

    private function postingData(Request $request): array
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:200'],
            'position' => ['required', 'string', 'max:200'],
            'description' => ['required', 'string'],
            'responsibilities' => ['nullable', 'string'],
            'qualifications' => ['nullable', 'string'],
            'required_skills' => ['nullable', 'array'],
            'required_skills.*' => ['string', 'max:100'],
            'required_course' => ['nullable', 'string', 'max:50'],
            'required_year_level' => ['nullable', 'string', 'max:20'],
            'slots' => ['required', 'integer', 'min:1', 'max:100'],
            'duration_months' => ['nullable', 'integer', 'min:1', 'max:24'],
            'required_hours' => ['nullable', 'integer', 'min:1'],
            'location' => ['required', 'string', 'max:200'],
            'work_setup' => ['required', 'in:on-site,remote,hybrid'],
            'is_paid' => ['boolean'],
            'allowance' => ['nullable', 'numeric', 'min:0'],
            'application_deadline' => ['nullable', 'date', 'after:today'],
            'internship_start' => ['nullable', 'date'],
            'internship_end' => ['nullable', 'date', 'after:internship_start'],
        ]);

        $validated['required_hours'] ??= (int) SystemSetting::get('default_required_hours', 480);

        return $validated;
    }
}
