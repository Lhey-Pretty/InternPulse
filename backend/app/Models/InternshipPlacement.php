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
            'required_hours' => 'integer',
            'rendered_hours' => 'integer',
            'approved_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    public function getRemainingHoursAttribute(): int
    {
        return max(0, (int) $this->required_hours - (int) $this->rendered_hours);
    }

    public function getCompletionPercentageAttribute(): float
    {
        $required = (int) $this->required_hours;

        if ($required <= 0) {
            return 0;
        }

        return min(100, round(((int) $this->rendered_hours / $required) * 100, 1));
    }

    public function studentProfile(): BelongsTo
    {
        return $this->belongsTo(StudentProfile::class);
    }

    public function internshipPosting(): BelongsTo
    {
        return $this->belongsTo(InternshipPosting::class);
    }

    public function application(): BelongsTo
    {
        return $this->belongsTo(Application::class);
    }

    public function approvedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
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
