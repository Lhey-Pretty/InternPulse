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
        'classification_result',
        'is_related',
        'confidence_score',
        'detected_tasks',
        'flag_level',
        'classification_feedback',
        'classification_status',
    ];

    protected function casts(): array
    {
        return [
            'entry_date' => 'date',
            'is_verified' => 'boolean',
            'is_related' => 'boolean',
            'confidence_score' => 'decimal:2',
            'detected_tasks' => 'array',
        ];
    }

    protected $appends = ['nlp_analysis'];

    /**
     * Shape the classification columns the coordinator and company journal
     * screens expect (`nlp_analysis`).
     */
    public function getNlpAnalysisAttribute(): array
    {
        return [
            'is_course_related' => (bool) ($this->is_related ?? true),
            'flag_level' => $this->flag_level ?: 'Normal',
            'confidence_score' => (float) ($this->confidence_score ?? 0),
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
