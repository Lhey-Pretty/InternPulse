<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Filters\V1\AuthorFilter;
use App\Http\Resources\V1\UserResource;
use App\Models\User;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Read-only view of the users who have created postings (the "authors").
 */
class AuthorsController extends ApiController
{
    /**
     * GET /api/v1/authors
     * Lists authors with filtering and sorting applied.
     */
    public function index(AuthorFilter $filters): AnonymousResourceCollection
    {
        return UserResource::collection(
            User::where('role', 'company')
                ->orWhereHas('companyProfile')
                ->filter($filters)
                ->paginate(10)
        );
    }

    /**
     * GET /api/v1/authors/{author}
     */
    public function show(User $author): UserResource
    {
        if ($this->include('internships')) {
            return new UserResource($author->load('internshipPostings'));
        }

        return new UserResource($author);
    }
}
