<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Filters\V1\InternshipPostingFilter;
use App\Http\Requests\Api\V1\ReplaceInternshipPostingRequest;
use App\Http\Requests\Api\V1\StoreInternshipPostingRequest;
use App\Http\Requests\Api\V1\UpdateInternshipPostingRequest;
use App\Http\Resources\V1\InternshipPostingResource;
use App\Models\InternshipPosting;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class InternshipPostingController extends ApiController
{
    /**
     * GET /api/v1/internships
     * Returns a paginated list (15 per page). Each item is filtered and transformed by InternshipPostingResource.
     *
     * @group Internship postings
     * @queryParam status string Filter by posting status. Example: approved
     * @queryParam title string Filter by title. Example: software
     * @queryParam include string Comma-separated relationships to include. Example: author
     */
    public function index(InternshipPostingFilter $filters): AnonymousResourceCollection
    {
        // Apply the filters from the URL (?status=..., ?title=*...*, ?createdAt=..., ?include=...)
        return InternshipPostingResource::collection(
            InternshipPosting::with('companyProfile')
                ->where('status', 'approved')
                ->filter($filters)
                ->paginate(10)
        );
    }

    /**
     * POST /api/v1/internships
     * Creates a new internship posting from a JSON:API payload, if authorized.
     *
     * @authenticated
     * @group Internship postings
     */
    public function store(StoreInternshipPostingRequest $request): InternshipPostingResource|\Illuminate\Http\JsonResponse
    {
        if ($this->isAble('store', InternshipPosting::class)) {
            $posting = InternshipPosting::create($request->mappedAttributes());

            return new InternshipPostingResource($posting);
        }

        return $this->notAuthorized('You are not authorized to create that resource.');
    }

    /**
     * GET /api/v1/internships/{internship}
     *
     * @group Internship postings
     * @urlParam internship integer required The internship posting ID. Example: 1
     */
    public function show(\Illuminate\Http\Request $request, InternshipPosting $internship): InternshipPostingResource
    {
        $user = $request->user();
        $canViewUnpublished = $user && (
            $user->isAdmin()
            || $user->isCoordinator()
            || ($user->isCompany() && $user->companyProfile?->id === $internship->company_profile_id)
        );
        abort_unless($internship->status === 'approved' || $canViewUnpublished, 404);

        // ?include=author: load the author of this internship
        if ($this->include('author')) {
            return new InternshipPostingResource($internship->load(['author', 'companyProfile']));
        }

        return new InternshipPostingResource($internship->load('companyProfile'));
    }

    /**
     * DELETE /api/v1/internships/{internship}
     * Deletes the posting, but only if the policy allows it.
     *
     * @authenticated
     * @group Internship postings
     * Step 16: Deleting resources with DELETE request
     */
    public function destroy(InternshipPosting $internship): \Illuminate\Http\JsonResponse
    {
        if ($this->isAble('delete', $internship)) {
            $internship->delete();

            return $this->ok('Internship posting successfully deleted.');
        }

        return $this->notAuthorized('You are not authorized to delete that resource.');
    }

    /**
     * PUT /api/v1/internships/{internship}
     * Replaces the whole posting, but only if the policy allows it.
     */
    public function replace(ReplaceInternshipPostingRequest $request, InternshipPosting $internship): InternshipPostingResource|\Illuminate\Http\JsonResponse
    {
        if ($this->isAble('replace', $internship)) {
            $internship->update($request->mappedAttributes());

            return new InternshipPostingResource($internship);
        }

        return $this->notAuthorized('You are not authorized to replace that resource.');
    }

    /**
     * PATCH /api/v1/internships/{internship}
     * Updates only the fields that were sent, but only if the policy allows it.
     */
    public function update(UpdateInternshipPostingRequest $request, InternshipPosting $internship): InternshipPostingResource|\Illuminate\Http\JsonResponse
    {
        // Ask InternshipPostingPolicy::update() (owner, or a user holding the broader ability)
        if ($this->isAble('update', $internship)) {
            $internship->update($request->mappedAttributes());

            return new InternshipPostingResource($internship);
        }

        return $this->notAuthorized('You are not authorized to update that resource.');
    }
}
