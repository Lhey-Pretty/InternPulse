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
        'category',
    ];

    public function students(): BelongsToMany
    {
        return $this->belongsToMany(StudentProfile::class, 'student_skills')
            ->withPivot('proficiency_level')
            ->withTimestamps();
    }
}
