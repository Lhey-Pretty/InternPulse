<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class InternshipPosting extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'company_profile_id',
        'title',
        'position',
        'description',
        'responsibilities',
        'qualifications',
        'required_skills',
        'required_course',
        'required_year_level',
        'slots',
        'duration_months',
        'required_hours',
        'location',
        'work_setup',
        'is_paid',
        'allowance',
        'application_deadline',
        'internship_start',
        'internship_end',
        'status',
        'rejection_reason',
        'approved_by',
        'approved_at',
    ];

    protected function casts(): array
    {
        return [
            'required_skills' => 'array',
            'is_paid' => 'boolean',
            'allowance' => 'decimal:2',
            'application_deadline' => 'date',
            'internship_start' => 'date',
            'internship_end' => 'date',
            'approved_at' => 'datetime',
            'slots' => 'integer',
            'required_hours' => 'integer',
        ];
    }

    public function isOpen(): bool
    {
        return ! $this->trashed() && $this->status === 'approved'
            && ($this->application_deadline === null || $this->application_deadline->isFuture());
    }

    public function getRemainingSlots(): int
    {
        $accepted = $this->applications()->whereIn('status', ['accepted'])->count();

        return max(0, $this->slots - $accepted);
    }

    public function companyProfile(): BelongsTo
    {
        return $this->belongsTo(CompanyProfile::class);
    }

    /**
     * The user who wrote/posted this internship (author).
     */
    public function author(): \Illuminate\Database\Eloquent\Relations\HasOneThrough
    {
        return $this->hasOneThrough(
            User::class,
            CompanyProfile::class,
            'id',
            'id',
            'company_profile_id',
            'user_id'
        );
    }

    public function approvedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function applications(): HasMany
    {
        return $this->hasMany(Application::class);
    }

    public function placements(): HasMany
    {
        return $this->hasMany(InternshipPlacement::class);
    }

    /**
     * Query scope: InternshipPosting::filter($filters) applies the filters sent in the URL.
     */
    public function scopeFilter(\Illuminate\Database\Eloquent\Builder $builder, \App\Http\Filters\V1\QueryFilter $filters): \Illuminate\Database\Eloquent\Builder
    {
        return $filters->apply($builder);
    }
}
