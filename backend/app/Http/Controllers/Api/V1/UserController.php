<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Filters\V1\AuthorFilter;
use App\Http\Requests\Api\V1\ReplaceUserRequest;
use App\Http\Requests\Api\V1\StoreUserRequest;
use App\Http\Requests\Api\V1\UpdateUserRequest;
use App\Http\Resources\V1\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class UserController extends ApiController
{
    /**
     * GET /api/v1/users
     * Lists users with AuthorFilter.
     */
    public function index(AuthorFilter $filters): AnonymousResourceCollection
    {
        $this->authorize('viewAny', User::class);

        return UserResource::collection(
            User::filter($filters)->paginate(10)
        );
    }

    /**
     * GET /api/v1/users/{user}
     */
    public function show(User $user): UserResource
    {
        $this->authorize('view', $user);

        if ($this->include('internships') || $this->include('products')) {
            return new UserResource($user->load('internshipPostings'));
        }

        return new UserResource($user);
    }

    /**
     * POST /api/v1/users
     * Creates a new user (managers only).
     */
    public function store(StoreUserRequest $request): UserResource|JsonResponse
    {
        if ($this->isAble('store', User::class)) {
            return new UserResource(
                User::create($request->mappedAttributes())
            );
        }

        return $this->notAuthorized('You are not authorized to create that resource.');
    }

    /**
     * PUT /api/v1/users/{user}
     * Replaces the whole user (managers only).
     */
    public function replace(ReplaceUserRequest $request, User $user): UserResource|JsonResponse
    {
        if ($this->isAble('replace', $user)) {
            $user->update($request->mappedAttributes());

            return new UserResource($user);
        }

        return $this->notAuthorized('You are not authorized to replace that resource.');
    }

    /**
     * PATCH /api/v1/users/{user}
     * Updates only sent fields for the user (managers only).
     */
    public function update(UpdateUserRequest $request, User $user): UserResource|JsonResponse
    {
        if ($this->isAble('update', $user)) {
            $user->update($request->mappedAttributes());

            return new UserResource($user);
        }

        return $this->notAuthorized('You are not authorized to update that resource.');
    }

    /**
     * DELETE /api/v1/users/{user}
     * Deletes the user (managers only).
     */
    public function destroy(User $user): JsonResponse
    {
        if ($this->isAble('delete', $user)) {
            $user->delete();

            return $this->ok('User successfully deleted');
        }

        return $this->notAuthorized('You are not authorized to delete that resource.');
    }
}
