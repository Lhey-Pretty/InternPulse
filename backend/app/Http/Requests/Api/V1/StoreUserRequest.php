<?php

namespace App\Http\Requests\Api\V1;

/**
 * Validates the body of POST /users.
 */
class StoreUserRequest extends BaseUserRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'data' => ['required', 'array:attributes'],
            'data.attributes' => ['required', 'array:name,email,isManager,password,role'],
            'data.attributes.name' => ['required', 'string', 'max:255'],
            // unique:users,email rejects an email that is already taken
            'data.attributes.email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'data.attributes.isManager' => ['required', 'boolean'],
            'data.attributes.password' => ['required', 'string', 'min:8', 'max:255'],
            'data.attributes.role' => ['sometimes', 'string', 'in:student,company,coordinator,admin'],
        ];
    }
}
