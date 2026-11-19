<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EvaluationCriterion extends Model
{
    use HasFactory;

    protected $fillable = [
        'type',
        'field_name',
        'label',
        'description',
        'order',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'order' => 'integer',
        ];
    }

    /**
     * Get active criteria for a specific type, ordered by display order.
     */
    public static function activeByType(string $type)
    {
        return static::where('type', $type)
            ->where('is_active', true)
            ->orderBy('order')
            ->get();
    }

    /**
     * Get all criteria for a specific type as field => label array.
     */
    public static function labelsArrayByType(string $type): array
    {
        return static::where('type', $type)
            ->where('is_active', true)
            ->orderBy('order')
            ->pluck('label', 'field_name')
            ->toArray();
    }

    /**
     * Get all active field names for a specific type.
     */
    public static function fieldNamesByType(string $type): array
    {
        return static::where('type', $type)
            ->where('is_active', true)
            ->orderBy('order')
            ->pluck('field_name')
            ->toArray();
    }
}
