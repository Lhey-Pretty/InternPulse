<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WeeklyLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'internship_placement_id',
        'student_profile_id',
        'week_number',
        'week_start',
        'week_end',
        'activities_done',
        'learnings',
        'challenges',
        'hours_this_week',
        'status',
        'supervisor_remarks',
        'submitted_at',
    ];

    protected function casts(): array
    {
        return [
            'week_start' => 'date',
            'week_end' => 'date',
            'hours_this_week' => 'decimal:2',
            'submitted_at' => 'datetime',
        ];
    }

    public function internshipPlacement(): BelongsTo
    {
        return $this->belongsTo(InternshipPlacement::class);
    }

    public function studentProfile(): BelongsTo
    {
        return $this->belongsTo(StudentProfile::class);
    }
}
