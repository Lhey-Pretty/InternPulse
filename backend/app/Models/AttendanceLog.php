<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AttendanceLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'internship_placement_id',
        'student_profile_id',
        'date',
        'time_in',
        'time_out',
        'hours_rendered',
        'status',
        'remarks',
        'review_decision', 'review_reason', 'reviewed_at', 'reviewed_by',
        'time_in_approved_by',
        'time_in_approved_at',
        'time_out_approved_by',
        'time_out_approved_at',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'reviewed_at' => 'datetime',
            'hours_rendered' => 'decimal:2',
            'time_in_approved_at' => 'datetime',
            'time_out_approved_at' => 'datetime',
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

    public function timeInApprovedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'time_in_approved_by')->withTrashed();
    }

    public function timeOutApprovedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'time_out_approved_by')->withTrashed();
    }

    public function isFullyApproved(): bool
    {
        return $this->time_in_approved_at !== null
            && $this->time_out !== null
            && $this->time_out_approved_at !== null;
    }
}
