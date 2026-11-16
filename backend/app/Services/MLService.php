<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class MLService
{
    protected string $baseUrl;
    protected int $timeout;

    public function __construct()
    {
        $this->baseUrl = config('services.ml.url', env('ML_SERVICE_URL', 'http://127.0.0.1:8001'));
        $this->timeout = (int) config('services.ml.timeout', 5);
    }

    /**
     * Compute Skill-based match score via Python ML service.
     */
    public function matchSkills(array $studentSkills, array $requiredSkills, array $optionalSkills = []): array
    {
        try {
            $response = Http::timeout($this->timeout)->post("{$this->baseUrl}/api/ml/skill-match", [
                'student_skills' => $studentSkills,
                'required_skills' => $requiredSkills,
                'optional_skills' => $optionalSkills,
            ]);

            if ($response->successful()) {
                return array_merge(['analysis_status' => 'completed'], $response->json());
            }
        } catch (\Throwable $e) {
            Log::warning('ML Service skill-match fallback triggered: ' . $e->getMessage());
        }

        return [
            'analysis_status' => 'unavailable',
            'requires_manual_review' => true,
            'message' => 'ML service is unavailable. Try again later.',
        ];
    }

    /**
     * Rank and recommend top internship postings for a student.
     */
    public function recommendInternships(string $studentCourse, array $studentSkills, array $postings, int $topK = 5): array
    {
        try {
            $response = Http::timeout($this->timeout)->post("{$this->baseUrl}/api/ml/recommend-internships", [
                'student_course' => $studentCourse,
                'student_skills' => $studentSkills,
                'postings' => $postings,
                'top_k' => $topK,
            ]);

            if ($response->successful()) {
                return array_merge(['analysis_status' => 'completed'], $response->json());
            }
        } catch (\Throwable $e) {
            Log::warning('ML Service recommend-internships fallback: ' . $e->getMessage());
        }

        // Fallback basic ranking
        return [
            'analysis_status' => 'unavailable',
            'requires_manual_review' => true,
            'student_course' => $studentCourse,
            'total_evaluated' => count($postings),
            'recommendations' => [],
            'message' => 'ML service is unavailable. Try again later.',
        ];
    }

    /**
     * NLP analysis of student journal entry (course alignment and errand detection).
     */
    public function analyzeJournal(string $studentCourse, string $journalText, ?string $preferredModel = null): array
    {
        try {
            $payload = [
                'student_course' => $studentCourse,
                'journal_text' => $journalText,
            ];
            if ($preferredModel) {
                $payload['preferred_model'] = $preferredModel;
            }

            $response = Http::timeout($this->timeout)->post("{$this->baseUrl}/api/ml/analyze-journal", $payload);

            if ($response->successful()) {
                return array_merge(['analysis_status' => 'completed'], $response->json());
            }
        } catch (\Throwable $e) {
            Log::warning('ML Service analyze-journal fallback: ' . $e->getMessage());
        }

        return [
            'analysis_status' => 'unavailable',
            'requires_manual_review' => true,
            'is_course_related' => true,
            'confidence_score' => 0.5,
            'detected_tasks' => [],
            'flag_level' => 'Normal',
            'feedback' => 'ML service is unavailable; manual review is required.',
        ];
    }

    /**
     * Batch journal analysis for up to 1,000+ entries.
     */
    public function analyzeJournalBatch(array $entries, ?string $preferredModel = null): array
    {
        try {
            $payload = ['entries' => $entries];
            if ($preferredModel) {
                $payload['preferred_model'] = $preferredModel;
            }

            $response = Http::timeout(30)->post("{$this->baseUrl}/api/ml/batch-analyze", $payload);
            if ($response->successful()) {
                return array_merge(['analysis_status' => 'completed'], $response->json());
            }
        } catch (\Throwable $e) {
            Log::warning('ML Service batch-analyze error: ' . $e->getMessage());
        }

        return [
            'analysis_status' => 'unavailable',
            'total_processed' => 0,
            'results' => [],
        ];
    }

    /**
     * Dual-model analysis comparing Rule-based vs ML side-by-side.
     */
    public function analyzeJournalDual(string $studentCourse, string $journalText): array
    {
        try {
            $response = Http::timeout($this->timeout)->post("{$this->baseUrl}/api/ml/analyze-journal/dual", [
                'student_course' => $studentCourse,
                'journal_text' => $journalText,
            ]);

            if ($response->successful()) {
                return array_merge(['analysis_status' => 'completed'], $response->json());
            }
        } catch (\Throwable $e) {
            Log::warning('ML Service dual analysis error: ' . $e->getMessage());
        }

        return ['analysis_status' => 'unavailable'];
    }

    /**
     * Explain model prediction with token feature attribution.
     */
    public function explainJournal(string $studentCourse, string $journalText): array
    {
        try {
            $response = Http::timeout($this->timeout)->post("{$this->baseUrl}/api/ml/explain", [
                'student_course' => $studentCourse,
                'journal_text' => $journalText,
            ]);

            if ($response->successful()) {
                return array_merge(['analysis_status' => 'completed'], $response->json());
            }
        } catch (\Throwable $e) {
            Log::warning('ML Service explain error: ' . $e->getMessage());
        }

        return ['analysis_status' => 'unavailable'];
    }

    /**
     * Get Model Governance and Registry status.
     */
    public function getModelGovernanceStatus(): array
    {
        try {
            $response = Http::timeout($this->timeout)->get("{$this->baseUrl}/api/ml/models");
            if ($response->successful()) {
                return $response->json();
            }
        } catch (\Throwable $e) {
            Log::warning('ML Service models status error: ' . $e->getMessage());
        }

        return ['summary' => [], 'models' => []];
    }

    /**
     * Get real curated O*NET/HuggingFace skills for a specific program.
     */
    public function getSkillsByCourse(string $courseCode): array
    {
        try {
            $response = Http::timeout($this->timeout)->get("{$this->baseUrl}/api/ml/skills-by-course/{$courseCode}");
            if ($response->successful()) {
                return array_merge(['analysis_status' => 'completed'], $response->json());
            }
        } catch (\Throwable $e) {
            Log::warning('ML Service getSkillsByCourse fallback: ' . $e->getMessage());
        }

        return ['course' => $courseCode, 'total_skills' => 0, 'skills' => []];
    }
}
