<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class InternshipPlacement extends Model
{
    use HasFactory;

    protected $fillable = [
        'student_profile_id',
        'internship_posting_id',
        'application_id',
        'approved_by',
        'start_date',
        'end_date',
        'required_hours',
        'rendered_hours',
        'status',
        'termination_reason',
        'legacy_credited_hours', 'previous_placement_id', 'last_working_date',
        'closure_reason', 'closed_at', 'closed_by', 'transfer_reason',
        'transferred_at', 'transferred_by', 'coordinator_id',
        'approved_at',
        'completed_at',
        'completion_approved_by',
        'completion_notes',
    ];

    protected $appends = ['remaining_hours', 'completion_percentage'];

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
            'required_hours' => 'float',
            'rendered_hours' => 'float',
            'legacy_credited_hours' => 'float',
            'last_working_date' => 'date',
            'closed_at' => 'datetime',
            'transferred_at' => 'datetime',
            'approved_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    public function getRemainingHoursAttribute(): float
    {
        return max(0, round((float) $this->required_hours - (float) $this->rendered_hours, 2));
    }

    public function getCompletionPercentageAttribute(): float
    {
        $required = (float) $this->required_hours;

        if ($required <= 0) {
            return 0;
        }

        return min(100, round(((float) $this->rendered_hours / $required) * 100, 1));
    }

    protected static function booted(): void
    {
        static::creating(function (self $placement) {
            if (! array_key_exists('legacy_credited_hours', $placement->getAttributes())) {
                $placement->legacy_credited_hours = $placement->rendered_hours ?? 0;
            }
        });
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

    public function approvedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by')->withTrashed();
    }

    public function attendanceLogs(): HasMany
    {
        return $this->hasMany(AttendanceLog::class);
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(InternshipTask::class);
    }

    public function evaluations(): HasMany
    {
        return $this->hasMany(Evaluation::class);
    }

    public function weeklyLogs(): HasMany
    {
        return $this->hasMany(WeeklyLog::class);
    }

    public function journalEntries(): HasMany
    {
        return $this->hasMany(JournalEntry::class);
    }

    public function companyRating(): HasOne
    {
        return $this->hasOne(CompanyRating::class);
    }
}
