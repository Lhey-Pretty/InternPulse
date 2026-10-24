<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AttendanceLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'internship_placement_id',
        'student_profile_id',
        'date',
        'time_in',
        'time_out',
        'hours_rendered',
        'status',
        'remarks',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'hours_rendered' => 'decimal:2',
        ];
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
