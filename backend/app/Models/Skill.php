<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Skill extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'canonical_name',
        'category',
        'aliases',
        'source',
        'is_active',
        'is_matchable',
        'approved_at',
    ];

    protected $casts = [
        'aliases' => 'array',
        'is_active' => 'boolean',
        'is_matchable' => 'boolean',
        'approved_at' => 'datetime',
    ];

    public function students(): BelongsToMany
    {
        return $this->belongsToMany(StudentProfile::class, 'student_skills')
            ->withTimestamps();
    }
}
