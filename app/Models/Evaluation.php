<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Evaluation extends Model
{
    use HasFactory;

    protected $fillable = [
        'internship_placement_id',
        'student_profile_id',
        'evaluated_by',
        'evaluation_period',
        'work_quality',
        'work_quantity',
        'punctuality',
        'attendance_score',
        'initiative',
        'teamwork',
        'communication',
        'problem_solving',
        'technical_skills',
        'professionalism',
        'overall_rating',
        'strengths',
        'areas_for_improvement',
        'general_comments',
        'recommendation',
        'submitted_at',
    ];

    protected function casts(): array
    {
        return [
            'work_quality' => 'decimal:1',
            'work_quantity' => 'decimal:1',
            'punctuality' => 'decimal:1',
            'attendance_score' => 'decimal:1',
            'initiative' => 'decimal:1',
            'teamwork' => 'decimal:1',
            'communication' => 'decimal:1',
            'problem_solving' => 'decimal:1',
            'technical_skills' => 'decimal:1',
            'professionalism' => 'decimal:1',
            'overall_rating' => 'decimal:2',
            'submitted_at' => 'datetime',
        ];
    }

    /**
     * Compute an average across all numeric criteria fields.
     */
    public function computeOverallRating(): float
    {
        $criteria = [
            $this->work_quality,
            $this->work_quantity,
            $this->punctuality,
            $this->attendance_score,
            $this->initiative,
            $this->teamwork,
            $this->communication,
            $this->problem_solving,
            $this->technical_skills,
            $this->professionalism,
        ];

        $filled = array_filter($criteria, fn ($v) => $v !== null);

        if (empty($filled)) {
            return 0;
        }

        return round(array_sum($filled) / count($filled), 2);
    }

    public function getGradeDescriptionAttribute(): string
    {
        return match (true) {
            $this->overall_rating >= 4.5 => 'Outstanding',
            $this->overall_rating >= 3.5 => 'Very Satisfactory',
            $this->overall_rating >= 2.5 => 'Satisfactory',
            $this->overall_rating >= 1.5 => 'Fair',
            default => 'Unsatisfactory',
        };
    }

    public function internshipPlacement(): BelongsTo
    {
        return $this->belongsTo(InternshipPlacement::class);
    }

    public function studentProfile(): BelongsTo
    {
        return $this->belongsTo(StudentProfile::class);
    }

    public function evaluatedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'evaluated_by');
    }
}
