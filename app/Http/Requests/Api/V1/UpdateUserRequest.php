<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Validation\Rule;

/**
 * Validates the body of PATCH /users/{user}: only the fields sent are checked.
 */
class UpdateUserRequest extends BaseUserRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $userId = $this->route('user')?->id ?? $this->route('user');

        return [
            'data.attributes.name' => ['sometimes', 'string'],
            'data.attributes.email' => [
                'sometimes',
                'email',
                Rule::unique('users', 'email')->ignore($userId),
            ],
            'data.attributes.isManager' => ['sometimes', 'boolean'],
            'data.attributes.password' => ['sometimes', 'string', 'min:8'],
        ];
    }
}
