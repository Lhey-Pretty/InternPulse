<?php

namespace App\Http\Filters\V1;

/** Query filters and safe sort fields for the applications collection. */
class ApplicationFilter extends QueryFilter
{
    protected array $sortable = [
        'appliedAt' => 'applied_at',
        'status',
        'createdAt' => 'created_at',
    ];

    /** ?status=pending,shortlisted */
    public function status(string $value): void
    {
        $statuses = array_values(array_filter(explode(',', $value)));
        if ($statuses !== []) {
            $this->builder->whereIn('status', $statuses);
        }
    }

    /** ?appliedAt=YYYY-MM-DD or ?appliedAt=from,to */
    public function appliedAt(string $value): void
    {
        $dates = explode(',', $value);
        if (count($dates) === 2) {
            $this->builder->whereBetween('applied_at', $dates);
        } else {
            $this->builder->whereDate('applied_at', $value);
        }
    }
}
