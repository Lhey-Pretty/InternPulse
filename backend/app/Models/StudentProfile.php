<?php

namespace App\Models;

use App\Support\PersonName;
use Illuminate\Database\Eloquent\Casts\Attribute;
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
        'ojt_required_hours',
        'bio',
        'career_interests',
        'resume_path',
        'profile_photo_path',
    ];

    protected $appends = ['full_name'];

    protected function casts(): array
    {
        return [
            'birth_date' => 'date',
            'required_hours' => 'integer',
            'ojt_required_hours' => 'float',
        ];
    }

    public function getFullNameAttribute(): string
    {
        return implode(' ', array_filter([$this->first_name, $this->middle_name, $this->last_name]));
    }

    /**
     * Legacy records were often typed in ALL CAPS; display them in Title Case.
     */
    protected function firstName(): Attribute
    {
        return Attribute::get(fn (?string $value): ?string => $value === null ? null : PersonName::format($value));
    }

    protected function middleName(): Attribute
    {
        return Attribute::get(fn (?string $value): ?string => $value === null ? null : PersonName::format($value));
    }

    protected function lastName(): Attribute
    {
        return Attribute::get(fn (?string $value): ?string => $value === null ? null : PersonName::format($value));
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function skills(): BelongsToMany
    {
        return $this->belongsToMany(Skill::class, 'student_skills')
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

    public function journals(): HasMany
    {
        return $this->hasMany(JournalEntry::class);
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
