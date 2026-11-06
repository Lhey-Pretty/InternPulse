<?php

namespace App\Http\Filters\V1;

/**
 * The filters and sort columns allowed on the authors and users endpoints.
 */
class AuthorFilter extends QueryFilter
{
    /**
     * The columns clients may sort users by.
     */
    protected array $sortable = [
        'name',
        'email',
        'createdAt' => 'created_at',
        'updatedAt' => 'updated_at',
    ];

    /**
     * ?id=1,2,3 (one or several ids)
     */
    public function id(string $value): void
    {
        $this->builder->whereIn('id', explode(',', $value));
    }

    /**
     * ?name=*john* (wildcard search)
     */
    public function name(string $value): void
    {
        $likeStr = str_replace('*', '%', $value);

        $this->builder->where('name', 'like', $likeStr);
    }

    /**
     * ?email=*@example.com (wildcard search)
     */
    public function email(string $value): void
    {
        $likeStr = str_replace('*', '%', $value);

        $this->builder->where('email', 'like', $likeStr);
    }

    /**
     * ?createdAt=2026-03-10 or ?createdAt=from,to
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
     * ?updatedAt=...
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
     * ?include=products / ?include=internships
     */
    public function include(string $value): void
    {
        $allowed = array_intersect(explode(',', strtolower($value)), ['internships', 'products', 'internshippostings']);

        $this->builder->with($allowed);
    }
}
