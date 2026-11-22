<?php

namespace App\Models;

use App\Support\AcademicPrograms;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CompanyProfile extends Model
{
    use HasFactory;

    /** Existing companies without a program assignment are shared partners. */
    public function scopeForProgram(Builder $query, ?string $program): Builder
    {
        $code = AcademicPrograms::code($program);
        if (! $code) {
            return $query;
        }

        $column = $query->getModel()->qualifyColumn('program');
        $values = array_values(array_unique([$code, ...AcademicPrograms::PROGRAMS[$code]]));

        return $query->where(fn (Builder $scope) => $scope
            ->whereIn($column, $values)
            ->orWhereRaw("TRIM(COALESCE({$column}, '')) = ''"));
    }

    public function isVisibleToProgram(?string $program): bool
    {
        $code = AcademicPrograms::code($program);

        return ! $code || trim((string) $this->program) === ''
            || AcademicPrograms::code($this->program) === $code;
    }

    protected $fillable = [
        'user_id',
        'company_name',
        'program',
        'industry',
        'description',
        'address',
        'city',
        'province',
        'website',
        'facebook_page',
        'contact_person',
        'contact_phone',
        'contact_email',
        'logo_path',
        'verification_status',
        'rejection_reason',
        'verified_at',
        'verified_by',
    ];

    protected function casts(): array
    {
        return [
            'verified_at' => 'datetime',
        ];
    }

    public function isVerified(): bool
    {
        return $this->verification_status === 'verified';
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function verifiedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    public function internshipPostings(): HasMany
    {
        return $this->hasMany(InternshipPosting::class);
    }

    public function activePostings(): HasMany
    {
        return $this->hasMany(InternshipPosting::class)->where('status', 'approved');
    }

    public function ratings(): HasMany
    {
        return $this->hasMany(CompanyRating::class);
    }

    public function getLocationAttribute(): string
    {
        $parts = array_filter([$this->city, $this->province]);
        if (!empty($parts)) {
            return implode(', ', $parts);
        }
        return $this->address ?: 'Location not specified';
    }

    public function averageRating(): float
    {
        return round((float) $this->ratings()->avg('average_rating'), 2);
    }
}
