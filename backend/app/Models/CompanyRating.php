<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CompanyRating extends Model
{
    use HasFactory;

    protected $fillable = [
        'company_profile_id',
        'internship_placement_id',
        'rated_by',
        'rater_role',
        'work_environment',
        'mentorship_quality',
        'learning_opportunities',
        'facilities',
        'overall_experience',
        'average_rating',
        'feedback',
        'would_recommend',
    ];

    protected function casts(): array
    {
        return [
            'work_environment' => 'decimal:1',
            'mentorship_quality' => 'decimal:1',
            'learning_opportunities' => 'decimal:1',
            'facilities' => 'decimal:1',
            'overall_experience' => 'decimal:1',
            'average_rating' => 'decimal:2',
            'would_recommend' => 'boolean',
        ];
    }

    public function computeAverage(): float
    {
        $criteria = [
            $this->work_environment,
            $this->mentorship_quality,
            $this->learning_opportunities,
            $this->facilities,
            $this->overall_experience,
        ];

        $filled = array_filter($criteria, fn ($v) => $v !== null);

        return empty($filled) ? 0 : round(array_sum($filled) / count($filled), 2);
    }

    public function companyProfile(): BelongsTo
    {
        return $this->belongsTo(CompanyProfile::class);
    }

    public function internshipPlacement(): BelongsTo
    {
        return $this->belongsTo(InternshipPlacement::class);
    }

    public function ratedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'rated_by');
    }
}
