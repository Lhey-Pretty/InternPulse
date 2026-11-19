<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Validation\Rule;

/**
 * Validates the body of PUT /users/{user}: every field is required.
 */
class ReplaceUserRequest extends BaseUserRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $userId = $this->route('user')?->id ?? $this->route('user');

        return [
            'data' => ['required', 'array:attributes'],
            'data.attributes' => ['required', 'array:name,email,isManager,password,role'],
            'data.attributes.name' => ['required', 'string', 'max:255'],
            'data.attributes.email' => [
                'required',
                'email',
                'max:255',
                // The email must be unique, except for the user being replaced
                Rule::unique('users', 'email')->ignore($userId),
            ],
            'data.attributes.isManager' => ['required', 'boolean'],
            'data.attributes.password' => ['required', 'string', 'min:8', 'max:255'],
            'data.attributes.role' => ['required', 'string', 'in:student,company,coordinator,admin'],
        ];
    }
}
