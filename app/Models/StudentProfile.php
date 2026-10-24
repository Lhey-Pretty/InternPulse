<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StudentProfile extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'student_id_number',
        'first_name',
        'last_name',
        'middle_name',
        'gender',
        'birth_date',
        'phone_number',
        'address',
        'course',
        'program',
        'year_level',
        'section',
        'school_name',
        'school_address',
        'required_hours',
        'bio',
        'career_interests',
        'resume_path',
        'profile_photo_path',
    ];

    protected function casts(): array
    {
        return [
            'birth_date' => 'date',
            'required_hours' => 'integer',
        ];
    }

    public function getFullNameAttribute(): string
    {
        return trim("{$this->first_name} {$this->middle_name} {$this->last_name}");
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function skills(): BelongsToMany
    {
        return $this->belongsToMany(Skill::class, 'student_skills')
            ->withPivot('proficiency_level')
            ->withTimestamps();
    }

    public function studentSkills(): HasMany
    {
        return $this->hasMany(StudentSkill::class);
    }

    public function applications(): HasMany
    {
        return $this->hasMany(Application::class);
    }

    public function placements(): HasMany
    {
        return $this->hasMany(InternshipPlacement::class);
    }

    public function activePlacement(): HasMany
    {
        return $this->hasMany(InternshipPlacement::class)->where('status', 'active');
    }

    public function attendanceLogs(): HasMany
    {
        return $this->hasMany(AttendanceLog::class);
    }

    public function evaluations(): HasMany
    {
        return $this->hasMany(Evaluation::class);
    }

    public function weeklyLogs(): HasMany
    {
        return $this->hasMany(WeeklyLog::class);
    }

    public function placementRecommendations(): HasMany
    {
        return $this->hasMany(PlacementRecommendation::class);
    }
}
