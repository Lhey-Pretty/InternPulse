<?php

namespace App\Http\Resources\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Transforms a User model into the JSON structure our API returns.
 */
class UserResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'type' => 'user',
            'id' => $this->id,
            'attributes' => [
                'name' => $this->name,
                'email' => $this->email,
                'isManager' => (bool) $this->is_manager,
                // These fields appear only on the authors and users endpoints
                $this->mergeWhen($request->routeIs(['authors.*', 'users.*']), [
                    'role' => $this->role,
                    'emailVerified' => (bool) $this->email_verified_at,
                    'createdAt' => $this->created_at?->toISOString(),
                    'updatedAt' => $this->updated_at?->toISOString(),
                ]),
            ],
            'links' => [
                'self' => route('authors.show', ['author' => $this->id]),
            ],
            // The internships array, present only when requested with ?include=internships or ?include=products
            'includes' => InternshipPostingResource::collection($this->whenLoaded('internshipPostings')),
        ];
    }
}
