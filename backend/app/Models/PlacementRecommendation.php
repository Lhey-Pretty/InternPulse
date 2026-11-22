<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlacementRecommendation extends Model
{
    use HasFactory;

    protected $fillable = [
        'student_profile_id',
        'internship_posting_id',
        'application_id',
        'recommended_by',
        'source',
        'score',
        'reason',
        'requested_start_date',
        'requested_end_date',
        'requested_required_hours',
        'status',
        'coordinator_notes',
        'confirmed_at',
    ];

    protected function casts(): array
    {
        return [
            'score' => 'decimal:2',
            'confirmed_at' => 'datetime',
            'requested_start_date' => 'date',
            'requested_end_date' => 'date',
            'requested_required_hours' => 'integer',
        ];
    }

    public function studentProfile(): BelongsTo
    {
        return $this->belongsTo(StudentProfile::class);
    }

    public function internshipPosting(): BelongsTo
    {
        return $this->belongsTo(InternshipPosting::class)->withTrashed();
    }

    public function application(): BelongsTo
    {
        return $this->belongsTo(Application::class);
    }

    public function recommendedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recommended_by')->withTrashed();
    }
}
