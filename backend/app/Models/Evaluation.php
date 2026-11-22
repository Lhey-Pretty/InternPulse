<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Evaluation extends Model
{
    use HasFactory;

    protected $appends = ['grade_description'];

    /**
     * Official MinSU OJT Performance Rating Sheet — 12 criteria, 1–5 scale.
     * Total points = sum of all 12 scores (max 60).
     * Equivalent rating is derived from the official conversion table (75–100).
     */

    protected $fillable = [
        'internship_placement_id',
        'student_profile_id',
        'evaluated_by',
        'evaluation_period',

        // ── Official 12 criteria (1–5 each) ──────────────────────────────
        'comprehension',          // 1. Comprehension
        'work_habits',            // 2. Work Habits and Attitude
        'work_quality',           // 3. Quality of Work
        'work_quantity',          // 4. Quantity of Work
        'cooperation',            // 5. Cooperation
        'attendance_punctuality', // 6. Attendance and Punctuality
        'judgment',               // 7. Judgment
        'attitude',               // 8. Attitude
        'safety',                 // 9. Safety
        'honesty_dependability',  // 10. Honesty and Dependability
        'leadership',             // 11. Leadership
        'personal_characteristics', // 12. Personal Characteristics

        // ── Computed scores ───────────────────────────────────────────────
        'overall_rating',         // average of 12 criteria (1–5)
        'total_points',           // sum of 12 criteria (12–60)
        'equivalent_rating',      // official converted grade (75–100)

        // ── Remarks & metadata ────────────────────────────────────────────
        'strengths',
        'areas_for_improvement',
        'general_comments',
        'recommendation',
        'rated_by_name',
        'inclusive_training_period',
        'agency_address',
        'submitted_at',
    ];

    protected function casts(): array
    {
        return [
            'comprehension'           => 'decimal:1',
            'work_habits'             => 'decimal:1',
            'work_quality'            => 'decimal:1',
            'work_quantity'           => 'decimal:1',
            'cooperation'             => 'decimal:1',
            'attendance_punctuality'  => 'decimal:1',
            'judgment'                => 'decimal:1',
            'attitude'                => 'decimal:1',
            'safety'                  => 'decimal:1',
            'honesty_dependability'   => 'decimal:1',
            'leadership'              => 'decimal:1',
            'personal_characteristics'=> 'decimal:1',
            'overall_rating'          => 'decimal:2',
            'total_points'            => 'integer',
            'equivalent_rating'       => 'integer',
            'submitted_at'            => 'datetime',
        ];
    }

    /**
     * The 12 official criteria field names.
     */
    public static function criteriaFields(): array
    {
        return [
            'comprehension',
            'work_habits',
            'work_quality',
            'work_quantity',
            'cooperation',
            'attendance_punctuality',
            'judgment',
            'attitude',
            'safety',
            'honesty_dependability',
            'leadership',
            'personal_characteristics',
        ];
    }

    /**
     * Human-readable labels for each criterion (matches the official form).
     */
    public static function criteriaLabels(): array
    {
        return [
            'comprehension'            => 'Comprehension',
            'work_habits'              => 'Work Habits and Attitude',
            'work_quality'             => 'Quality of Work',
            'work_quantity'            => 'Quantity of Work',
            'cooperation'              => 'Cooperation',
            'attendance_punctuality'   => 'Attendance and Punctuality',
            'judgment'                 => 'Judgment',
            'attitude'                 => 'Attitude',
            'safety'                   => 'Safety',
            'honesty_dependability'    => 'Honesty and Dependability',
            'leadership'               => 'Leadership',
            'personal_characteristics' => 'Personal Characteristics',
        ];
    }

    /**
     * Sum all 12 criteria scores (max = 60).
     */
    public function computeTotalPoints(): int
    {
        $sum = 0;
        foreach (self::criteriaFields() as $field) {
            $sum += (float) ($this->{$field} ?? 0);
        }

        return (int) round($sum);
    }

    /**
     * Average of the 12 criteria (1–5 scale).
     */
    public function computeOverallRating(): float
    {
        $filled = array_filter(
            array_map(fn ($f) => $this->{$f}, self::criteriaFields()),
            fn ($v) => $v !== null
        );

        if (empty($filled)) {
            return 0;
        }

        return round(array_sum($filled) / count($filled), 2);
    }

    /**
     * Convert total points (12–60) to equivalent rating (75–100)
     * using the official MinSU conversion table.
     *
     * Table (total_points => equivalent_rating):
     *   60→100, 59→99, 57-58→98, 55-56→97, 53-54→96,
     *   51-52→95, 49-50→94, 47-48→93, 45-46→92, 43-44→91,
     *   41-42→90, 39-40→89, 37-38→88, 35-36→87, 33-34→86,
     *   31-32→85, 29-30→84, 27-28→83, 25-26→82, 23-24→81,
     *   21-22→80, 19-20→79, 17-18→78, 15-16→77, 13-14→76, 12→75
     */
    public static function convertToEquivalentRating(int $totalPoints): int
    {
        return match (true) {
            $totalPoints >= 60 => 100,
            $totalPoints === 59 => 99,
            $totalPoints >= 57 => 98,
            $totalPoints >= 55 => 97,
            $totalPoints >= 53 => 96,
            $totalPoints >= 51 => 95,
            $totalPoints >= 49 => 94,
            $totalPoints >= 47 => 93,
            $totalPoints >= 45 => 92,
            $totalPoints >= 43 => 91,
            $totalPoints >= 41 => 90,
            $totalPoints >= 39 => 89,
            $totalPoints >= 37 => 88,
            $totalPoints >= 35 => 87,
            $totalPoints >= 33 => 86,
            $totalPoints >= 31 => 85,
            $totalPoints >= 29 => 84,
            $totalPoints >= 27 => 83,
            $totalPoints >= 25 => 82,
            $totalPoints >= 23 => 81,
            $totalPoints >= 21 => 80,
            $totalPoints >= 19 => 79,
            $totalPoints >= 17 => 78,
            $totalPoints >= 15 => 77,
            $totalPoints >= 13 => 76,
            default            => 75,
        };
    }

    /**
     * Grade description based on equivalent rating (75–100 scale).
     */
    public function getGradeDescriptionAttribute(): string
    {
        $rating = $this->equivalent_rating ?? 0;

        return match (true) {
            $rating >= 96 => 'Excellent',
            $rating >= 90 => 'Very Satisfactory',
            $rating >= 84 => 'Satisfactory',
            $rating >= 78 => 'Needs Improvement',
            default       => 'Poor',
        };
    }

    // ── Relationships ─────────────────────────────────────────────────────────

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
        return $this->belongsTo(User::class, 'evaluated_by')->withTrashed();
    }
}
