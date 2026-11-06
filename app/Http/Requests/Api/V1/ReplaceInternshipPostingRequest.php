<?php

namespace App\Http\Requests\Api\V1;

use App\Models\CompanyProfile;
use App\Models\User;

/**
 * Validates the body of PUT /api/v1/internships/{internship}:
 * PUT replaces the whole resource, so every field is required.
 */
class ReplaceInternshipPostingRequest extends BaseInternshipPostingRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Validation rules: every field is required for a complete replacement.
     */
    public function rules(): array
    {
        $isNested = $this->routeIs('users.internships.*', 'users.products.*', 'authors.internships.*');

        $rules = [
            'data' => ['required', 'array'],
            'data.attributes' => ['required', 'array'],
            'data.attributes.title' => ['required_without:data.attributes.product', 'string', 'max:255'],
            'data.attributes.product' => ['required_without:data.attributes.title', 'string'],
            'data.attributes.description' => ['required', 'string'],
            'data.attributes.status' => ['required', 'string', 'in:approved,pending,closed,draft,A,C,H,X'],
        ];

        if ($isNested) {
            $rules['author_id'] = ['required', 'integer', 'exists:users,id'];
        } else {
            $rules['data.relationships'] = ['required', 'array'];
            // Accept either user (tutorial style) or author (JSON:API standard)
            $rules['data.relationships.user.data.id'] = ['required_without:data.relationships.author.data.id', 'integer', 'exists:users,id'];
            $rules['data.relationships.author.data.id'] = ['required_without:data.relationships.user.data.id', 'integer', 'exists:users,id'];
        }

        return $rules;
    }

    /**
     * Pre-validation merge for nested routes where author is in the URL.
     */
    protected function prepareForValidation(): void
    {
        if ($this->routeIs('users.internships.*', 'users.products.*', 'authors.internships.*')) {
            $this->merge([
                'author_id' => $this->route('user')?->id ?? $this->route('user') ?? $this->route('author')?->id ?? $this->route('author'),
            ]);
        }
    }

    /**
     * Maps attributes for database columns with defaults for required InternPulse fields.
     */
    public function mappedAttributes(array $otherAttributes = []): array
    {
        $attributes = parent::mappedAttributes($otherAttributes);

        // Map product to title if needed
        if (! isset($attributes['title']) && isset($attributes['product'])) {
            $attributes['title'] = $attributes['product'];
        }

        // Set default position if missing
        if (! isset($attributes['position'])) {
            $attributes['position'] = $attributes['title'] ?? 'Intern';
        }

        // Map tutorial statuses A/C/H/X to InternPulse statuses
        if (isset($attributes['status'])) {
            $statusMap = [
                'A' => 'approved',
                'C' => 'closed',
                'H' => 'pending',
                'X' => 'closed',
            ];
            if (isset($statusMap[$attributes['status']])) {
                $attributes['status'] = $statusMap[$attributes['status']];
            }
        }

        // Associate with author's CompanyProfile in InternPulse
        if (! isset($attributes['company_profile_id'])) {
            $userId = $attributes['author_id']
                ?? $this->input('data.relationships.author.data.id')
                ?? $this->input('data.relationships.user.data.id');
            if ($userId) {
                $user = User::find($userId);
                $company = $user?->companyProfile ?? CompanyProfile::firstOrCreate(
                    ['user_id' => $userId],
                    [
                        'company_name' => ($user?->name ?? 'Partner Company').' Inc.',
                        'industry' => 'Information Technology',
                        'description' => 'Partner company offering internship positions.',
                        'verification_status' => 'verified',
                    ]
                );
                $attributes['company_profile_id'] = $company->id;
            }
        }

        return $attributes;
    }
}
