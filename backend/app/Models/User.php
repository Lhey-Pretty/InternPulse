<?php

namespace App\Models;

use Database\Factories\UserFactory;
use App\Support\PersonName;
use App\Models\SystemSetting;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'is_manager',
        'is_active',
        'is_temporary',
        'must_change_password',
        'access_starts_at',
        'access_ends_at',
        'password_changed_at',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_manager' => 'boolean',
            'is_active' => 'boolean',
            'is_temporary' => 'boolean',
            'must_change_password' => 'boolean',
            'access_starts_at' => 'datetime',
            'access_ends_at' => 'datetime',
            'login_locked_until' => 'datetime',
            'password_changed_at' => 'datetime',
        ];
    }

    /**
     * Names are stored however they were typed; always render them in Title Case.
     */
    protected function name(): Attribute
    {
        return Attribute::get(fn (?string $value): ?string => $value === null ? null : PersonName::format($value));
    }

    /**
     * Checks if the user's token (or abilities list) grants a specific ability.
     */
    public function tokenCan(string $ability): bool
    {
        $tokenAbilities = request()->attributes->get('jwt_payload')['abilities'] ?? null;
        if (is_array($tokenAbilities)) {
            return in_array($ability, $tokenAbilities, true);
        }

        return in_array($ability, \App\Permissions\V1\Abilities::getAbilities($this), true);
    }

    // ── Role helpers ──────────────────────────────────────────────

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function isStudent(): bool
    {
        return $this->role === 'student';
    }

    public function isCompany(): bool
    {
        return $this->role === 'company';
    }

    public function isCoordinator(): bool
    {
        return $this->role === 'coordinator';
    }

    // ── Temporary access helpers ──────────────────────────────────

    /**
     * Whether this user's account is within its allowed access window.
     * Non-temporary accounts always pass.
     */
    public function hasActiveAccess(): bool
    {
        if (! $this->is_temporary) {
            return $this->is_active;
        }

        $now = now();

        $afterStart = $this->access_starts_at === null || $now->gte($this->access_starts_at);
        $beforeEnd = $this->access_ends_at === null || $now->lte($this->access_ends_at);

        return $this->is_active && $afterStart && $beforeEnd;
    }

    public function passwordChangeRequired(): bool
    {
        if ($this->must_change_password) {
            return true;
        }

        $expiryDays = (int) SystemSetting::get('password_expiry_days', 90);
        if ($expiryDays <= 0) {
            return false;
        }

        return $this->password_changed_at === null
            || $this->password_changed_at->lte(now()->subDays($expiryDays));
    }

    public function accessExpired(): bool
    {
        return $this->is_temporary
            && $this->access_ends_at !== null
            && now()->gt($this->access_ends_at);
    }

    public function accessNotStarted(): bool
    {
        return $this->is_temporary
            && $this->access_starts_at !== null
            && now()->lt($this->access_starts_at);
    }

    // ── Relationships ─────────────────────────────────────────────

    public function studentProfile(): HasOne
    {
        return $this->hasOne(StudentProfile::class);
    }

    public function companyProfile(): HasOne
    {
        return $this->hasOne(CompanyProfile::class);
    }

    public function coordinatorProfile(): HasOne
    {
        return $this->hasOne(CoordinatorProfile::class);
    }

    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class);
    }

    public function unreadNotificationsCount(): int
    {
        return $this->notifications()->where('is_read', false)->count();
    }

    /**
     * The internship postings written by this user (through CompanyProfile).
     */
    public function internshipPostings(): \Illuminate\Database\Eloquent\Relations\HasManyThrough
    {
        return $this->hasManyThrough(InternshipPosting::class, CompanyProfile::class);
    }

    /**
     * Alias for tutorial compatibility (?include=products).
     */
    public function products(): \Illuminate\Database\Eloquent\Relations\HasManyThrough
    {
        return $this->internshipPostings();
    }

    /**
     * Alias for nested route scoping (?include=internships).
     */
    public function internships(): \Illuminate\Database\Eloquent\Relations\HasManyThrough
    {
        return $this->internshipPostings();
    }

    /**
     * Query scope: User::filter($filters) applies the filters sent in the URL.
     */
    public function scopeFilter(\Illuminate\Database\Eloquent\Builder $builder, \App\Http\Filters\V1\QueryFilter $filters): \Illuminate\Database\Eloquent\Builder
    {
        return $filters->apply($builder);
    }
}
