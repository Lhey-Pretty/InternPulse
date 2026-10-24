<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CompanyProfile extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'company_name',
        'industry',
        'description',
        'address',
        'city',
        'province',
        'website',
        'contact_person',
        'contact_phone',
        'contact_email',
        'logo_path',
        'verification_status',
        'rejection_reason',
        'verified_at',
        'verified_by',
        'eligibility_status',
        'eligibility_notes',
        'eligibility_reviewed_at',
    ];

    protected function casts(): array
    {
        return [
            'verified_at' => 'datetime',
            'eligibility_reviewed_at' => 'datetime',
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

    public function averageRating(): float
    {
        return round((float) $this->ratings()->avg('average_rating'), 2);
    }
}
