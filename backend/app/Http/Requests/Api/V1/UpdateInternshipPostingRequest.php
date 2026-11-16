<?php

namespace App\Http\Requests\Api\V1;

// Step 24: The principle of least privilege
class UpdateInternshipPostingRequest extends StoreInternshipPostingRequest
{
    public function rules(): array
    {
        return [
            'data' => ['required', 'array'],
            'data.attributes' => ['required', 'array'],
            'data.attributes.title' => ['sometimes', 'string', 'max:255'],
            'data.attributes.description' => ['sometimes', 'nullable', 'string'],
            'data.attributes.status' => ['sometimes', 'string', 'in:approved,pending,closed,draft,A,C,H,X'],
        ];
    }
}
