<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Application extends Model
{
    use HasFactory;

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
}
