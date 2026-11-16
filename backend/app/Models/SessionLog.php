<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SessionLog extends Model
{
    protected $fillable = [
        'user_id',
        'email',
        'event',
        'session_id',
        'user_agent',
        'logged_in_at',
        'logged_out_at',
    ];

    protected function casts(): array
    {
        return [
            'logged_in_at' => 'datetime',
            'logged_out_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public static function record(string $event, ?User $user = null, ?string $email = null): self
    {
        return self::create([
            'user_id' => $user?->id,
            'email' => $email ?: $user?->email,
            'event' => $event,
            'session_id' => session()->getId(),
            'user_agent' => request()->userAgent(),
            'logged_in_at' => $event === 'login' ? now() : null,
            'logged_out_at' => $event === 'logout' ? now() : null,
        ]);
    }

    public static function closeCurrent(?User $user): void
    {
        if (! $user) {
            return;
        }

        self::where('user_id', $user->id)
            ->where('event', 'login')
            ->whereNull('logged_out_at')
            ->latest('logged_in_at')
            ->first()
            ?->update(['logged_out_at' => now()]);
    }
}
