<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validates the data sent to POST /api/v1/auth/register for InternPulse.
 */
class RegisterUserRequest extends FormRequest
{
    /**
     * Anyone may call this endpoint, so authorization always passes.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * The validation rules. On failure Laravel stops here and returns 422.
     */
    public function rules(): array
    {
        $rules = [
            'account_type' => ['sometimes', 'in:student,company'],
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ];

        if ($this->input('account_type') === 'company') {
            $rules += [
                'company_name' => ['required', 'string', 'max:200'],
                'address' => ['required', 'string', 'max:500'],
                'industry' => ['nullable', 'string', 'max:100'],
                'description' => ['nullable', 'string'],
                'contact_person' => ['required', 'string', 'max:100'],
                'contact_phone' => ['required', 'string', 'max:20'],
                'website' => ['nullable', 'url', 'max:200'],
            ];
        }

        return $rules;
    }
}
