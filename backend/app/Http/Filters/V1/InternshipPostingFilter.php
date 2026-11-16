<?php

namespace App\Http\Filters\V1;

/**
 * The filters allowed on the internship postings endpoints.
 */
class InternshipPostingFilter extends QueryFilter
{
    /**
     * The columns clients may sort postings by.
     */
    protected array $sortable = [
        'title',
        'position',
        'status',
        'location',
        'product' => 'title',
        'createdAt' => 'created_at',
        'updatedAt' => 'updated_atX ',
    ];

    /**
     * ?createdAt=2026-03-10            one day
     * ?createdAt=2026-03-01,2026-03-31 a date range (from, to)
     */
    public function createdAt(string $value): void
    {
        $dates = explode(',', $value);

        if (count($dates) > 1) {
            $this->builder->whereBetween('created_at', $dates);

            return;
        }

        $this->builder->whereDate('created_at', $value);
    }

    /**
     * ?updatedAt=... works exactly like createdAt, on the updated_at column.
     */
    public function updatedAt(string $value): void
    {
        $dates = explode(',', $value);

        if (count($dates) > 1) {
            $this->builder->whereBetween('updated_at', $dates);

            return;
        }

        $this->builder->whereDate('updated_at', $value);
    }

    /**
     * ?include=author loads the author. Only relationship names on the
     * allowed list are accepted, so clients cannot request anything else.
     */
    public function include(string $value): void
    {
        $mapping = [
            'author' => 'author',
            'company' => 'companyProfile', // Map 'company' to actual relationship name
        ];

        $requested = explode(',', strtolower($value));
        $includes = [];

        foreach ($requested as $key) {
            if (isset($mapping[$key])) {
                $includes[] = $mapping[$key];
            }
        }

        if (!empty($includes)) {
            $this->builder->with($includes);
        }
    }

    /**
     * ?status=approved or ?status=approved,pending (one or several statuses)
     */
    public function status(string $value): void
    {
        $this->builder->whereIn('status', explode(',', $value));
    }

    /**
     * ?title=*dev* (the * wildcard becomes SQL's % in a LIKE search)
     */
    public function title(string $value): void
    {
        $likeStr = str_replace('*', '%', $value);

        $this->builder->where('title', 'like', $likeStr);
    }

    /**
     * ?position=*developer* (wildcard LIKE search on position)
     */
    public function position(string $value): void
    {
        $likeStr = str_replace('*', '%', $value);

        $this->builder->where('position', 'like', $likeStr);
    }

    /**
     * ?product=*dev* (alias for tutorial test compatibility)
     */
    public function product(string $value): void
    {
        $likeStr = str_replace('*', '%', $value);

        $this->builder->where(function ($q) use ($likeStr): void {
            $q->where('title', 'like', $likeStr)
                ->orWhere('position', 'like', $likeStr);
        });
    }

    /**
     * ?location=*Manila*
     */
    public function location(string $value): void
    {
        $likeStr = str_replace('*', '%', $value);

        $this->builder->where('location', 'like', $likeStr);
    }

    /**
     * ?workSetup=remote or ?workSetup=remote,hybrid
     */
    public function workSetup(string $value): void
    {
        $this->builder->whereIn('work_setup', explode(',', $value));
    }
}
