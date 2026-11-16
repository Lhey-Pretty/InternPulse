<?php

namespace App\Http\Requests\Api\V1;

// Step 21: Applying granular permissions on store
class StoreInternshipPostingRequest extends BaseInternshipPostingRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'data' => ['required', 'array'],
            'data.attributes' => ['required', 'array'],
            'data.attributes.title' => ['required_without:data.attributes.product', 'string', 'max:255'],
            'data.attributes.product' => ['required_without:data.attributes.title', 'string', 'max:255'],
            'data.attributes.description' => ['nullable', 'string'],
            'data.attributes.status' => ['nullable', 'string', 'in:approved,pending,closed,draft,A,C,H,X'],
            'data.relationships' => ['nullable', 'array'],
            'data.relationships.author.data.id' => ['nullable', 'integer', 'exists:users,id'],
            'data.relationships.user.data.id' => ['nullable', 'integer', 'exists:users,id'],
        ];
    }

    public function mappedAttributes(array $otherAttributes = []): array
    {
        $attributes = parent::mappedAttributes($otherAttributes);
        $attributes['title'] ??= $attributes['product'] ?? null;
        $attributes['position'] ??= $attributes['title'] ?? 'Intern';
        $attributes['status'] ??= 'pending';

        return array_filter($attributes, static fn ($value) => $value !== null);
    }
}
