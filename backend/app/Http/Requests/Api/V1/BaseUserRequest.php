<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Arr;

/**
 * Shared by every user request (store, replace, update).
 */
class BaseUserRequest extends FormRequest
{
    /**
     * Converts the nested JSON:API payload into columns of the users table.
     * Only keys that were actually sent are returned.
     */
    public function mappedAttributes(array $otherAttributes = []): array
    {
        // JSON path in the request => column in the users table
        $attributeMap = array_merge([
            'data.attributes.name' => 'name',
            'data.attributes.email' => 'email',
            'data.attributes.isManager' => 'is_manager',
            'data.attributes.password' => 'password',
            'data.attributes.role' => 'role',
        ], $otherAttributes);

        $validated = $this->validated();
        $attributesToUpdate = [];

        foreach ($attributeMap as $key => $attribute) {
            if (Arr::has($validated, $key)) {
                $value = Arr::get($validated, $key);

                // Never store a plain password: hash it first
                if ($attribute === 'password') {
                    $value = bcrypt($value);
                }

                $attributesToUpdate[$attribute] = $value;
            }
        }

        foreach ($otherAttributes as $key => $value) {
            if (! str_contains($key, '.')) {
                $attributesToUpdate[$key] = $value;
            }
        }

        return $attributesToUpdate;
    }
}
