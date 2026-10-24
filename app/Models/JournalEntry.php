<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JournalEntry extends Model
{
    use HasFactory;

    protected $fillable = [
        'internship_placement_id',
        'student_profile_id',
        'entry_date',
        'title',
        'content',
        'reflection',
        'mood',
        'supervisor_remarks',
        'is_verified',
    ];

    protected function casts(): array
    {
        return [
            'entry_date' => 'date',
            'is_verified' => 'boolean',
        ];
    }

    public function getMoodEmojiAttribute(): string
    {
        return match ($this->mood) {
            'excellent' => '😄',
            'good' => '🙂',
            'neutral' => '😐',
            'difficult' => '😟',
            'challenging' => '😤',
            default => '📝',
        };
    }

    public function internshipPlacement(): BelongsTo
    {
        return $this->belongsTo(InternshipPlacement::class);
    }

    public function studentProfile(): BelongsTo
    {
        return $this->belongsTo(StudentProfile::class);
    }
}
