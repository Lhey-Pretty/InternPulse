<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Shared by every posting/product request (store, replace, update).
 */
class BaseInternshipPostingRequest extends FormRequest
{
    /**
     * Converts the nested JSON:API payload into database columns.
     * Only keys that were actually sent are returned, which is what makes PATCH work.
     *
     * Example: data.attributes.title -> title
     *          data.relationships.author.data.id -> author_id
     */
    public function mappedAttributes(array $otherAttributes = []): array
    {
        // JSON path in the request => column in the database table
        $attributeMap = array_merge([
            'data.attributes.title' => 'title',
            'data.attributes.position' => 'position',
            'data.attributes.description' => 'description',
            'data.attributes.responsibilities' => 'responsibilities',
            'data.attributes.qualifications' => 'qualifications',
            'data.attributes.requiredSkills' => 'required_skills',
            'data.attributes.requiredCourse' => 'required_course',
            'data.attributes.requiredYearLevel' => 'required_year_level',
            'data.attributes.slots' => 'slots',
            'data.attributes.durationMonths' => 'duration_months',
            'data.attributes.requiredHours' => 'required_hours',
            'data.attributes.location' => 'location',
            'data.attributes.workSetup' => 'work_setup',
            'data.attributes.isPaid' => 'is_paid',
            'data.attributes.allowance' => 'allowance',
            'data.attributes.applicationDeadline' => 'application_deadline',
            'data.attributes.status' => 'status',
            // Also support data.attributes.product for tutorial compatibility
            'data.attributes.product' => 'title',
            'data.relationships.author.data.id' => 'author_id',
            'data.relationships.company.data.id' => 'company_profile_id',
            'data.relationships.user.data.id' => 'user_id',
            'author_id' => 'author_id',
        ], $otherAttributes);

        $attributesToUpdate = [];

        foreach ($attributeMap as $key => $attribute) {
            // Include the value only if the client sent or merged that field
            if ($this->has($key)) {
                $attributesToUpdate[$attribute] = $this->input($key);
            }
        }

        // Support passing direct key => value overrides (e.g. ['author_id' => $user->id])
        foreach ($otherAttributes as $key => $value) {
            if (! str_contains($key, '.')) {
                $attributesToUpdate[$key] = $value;
            }
        }

        return $attributesToUpdate;
    }

    /**
     * Custom validation messages. The key format is "field.rule".
     */
    public function messages(): array
    {
        return [
            'data.attributes.status.in' => 'The data.attributes.status value is invalid. Please use approved, pending, closed, or A, C, H, X.',
            'data.relationships.user.data.id.exists' => 'The selected user id is invalid.',
            'data.relationships.author.data.id.exists' => 'The selected author id is invalid.',
            'data.relationships.user.data.id.required_without' => 'The user id is required.',
            'data.relationships.author.data.id.required_without' => 'The author id is required.',
            'author_id.exists' => 'The selected author id is invalid.',
        ];
    }
}
