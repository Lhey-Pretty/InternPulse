<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Filters\V1\InternshipPostingFilter;
use App\Http\Requests\Api\V1\ReplaceInternshipPostingRequest;
use App\Http\Requests\Api\V1\StoreInternshipPostingRequest;
use App\Http\Requests\Api\V1\UpdateInternshipPostingRequest;
use App\Http\Resources\V1\InternshipPostingResource;
use App\Models\InternshipPosting;
use App\Models\User;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Nested resource: internship postings that belong to one user/author.
 * Endpoint: /api/v1/users/{user}/internships
 * Step 13: Using and filtering nested resources
 */
class UserInternshipsController extends ApiController
{
    /**
     * GET /api/v1/users/{user}/internships
     * Lists only this user's internships. All InternshipPostingFilter parameters work here too.
     */
    public function index(User $user, InternshipPostingFilter $filters): AnonymousResourceCollection
    {
        return InternshipPostingResource::collection(
            InternshipPosting::whereHas('companyProfile', function ($q) use ($user): void {
                $q->where('user_id', $user->id);
            })->filter($filters)->paginate(15)
        );
    }

    /**
     * POST /api/v1/users/{user}/internships
     * Creates a new internship posting scoped to the specified user/author, if authorized.
     */
    public function store(User $user, StoreInternshipPostingRequest $request): InternshipPostingResource|\Illuminate\Http\JsonResponse
    {
        if ($this->isAble('store', InternshipPosting::class)) {
            return new InternshipPostingResource(
                InternshipPosting::create($request->mappedAttributes([
                    'author_id' => $user->id,
                ]))
            );
        }

        return $this->notAuthorized('You are not authorized to create that resource.');
    }

    /**
     * DELETE /api/v1/users/{user}/internships/{internship}
     * Deletes the user's internship posting, but only if the policy allows it.
     */
    public function destroy(User $user, InternshipPosting $internship): \Illuminate\Http\JsonResponse
    {
        if ($this->isAble('delete', $internship)) {
            $internship->delete();

            $message = request()->routeIs('*products*')
                ? 'Product successfully deleted'
                : 'Internship posting successfully deleted';

            return $this->ok($message);
        }

        return $this->notAuthorized('You are not authorized to delete that resource.');
    }

    /**
     * PUT /api/v1/users/{user}/internships/{internship}
     * Replaces the user's internship posting completely, but only if the policy allows it.
     */
    public function replace(ReplaceInternshipPostingRequest $request, User $user, InternshipPosting $internship): InternshipPostingResource|\Illuminate\Http\JsonResponse
    {
        if ($this->isAble('replace', $internship)) {
            $internship->update($request->mappedAttributes([
                'author_id' => $user->id,
            ]));

            return new InternshipPostingResource($internship);
        }

        return $this->notAuthorized('You are not authorized to replace that resource.');
    }

    /**
     * PATCH /api/v1/users/{user}/internships/{internship}
     * Updates only the fields that were sent for the user's internship, if authorized.
     */
    public function update(UpdateInternshipPostingRequest $request, User $user, InternshipPosting $internship): InternshipPostingResource|\Illuminate\Http\JsonResponse
    {
        if ($this->isAble('update', $internship)) {
            $internship->update($request->mappedAttributes([
                'author_id' => $user->id,
            ]));

            return new InternshipPostingResource($internship);
        }

        return $this->notAuthorized('You are not authorized to update that resource.');
    }
}
