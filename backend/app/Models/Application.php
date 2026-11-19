<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Application extends Model
{
    use HasFactory;

    /** Apply supported query-string filters to the applications listing. */
    public function scopeFilter(\Illuminate\Database\Eloquent\Builder $builder, \App\Http\Filters\V1\QueryFilter $filters): \Illuminate\Database\Eloquent\Builder
    {
        return $filters->apply($builder);
    }

    protected $fillable = [
        'student_profile_id',
        'internship_posting_id',
        'status',
        'cover_letter',
        'resume_path',
        'match_score',
        'match_details',
        'interview_date',
        'interview_time',
        'interview_location',
        'interview_notes',
        'rejection_reason',
        'applied_at',
        'reviewed_at',
    ];

    protected function casts(): array
    {
        return [
            'match_details' => 'array',
            'match_score' => 'decimal:2',
            'interview_date' => 'date',
            'applied_at' => 'datetime',
            'reviewed_at' => 'datetime',
        ];
    }

    public function studentProfile(): BelongsTo
    {
        return $this->belongsTo(StudentProfile::class);
    }

    public function internshipPosting(): BelongsTo
    {
        return $this->belongsTo(InternshipPosting::class);
    }

    public function placement(): HasOne
    {
        return $this->hasOne(InternshipPlacement::class);
    }

    public function placementRecommendations(): HasMany
    {
        return $this->hasMany(PlacementRecommendation::class);
    }
}
