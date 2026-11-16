<?php

namespace App\Http\Resources\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class InternshipPostingResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'type' => 'internship',
            'id' => $this->id,
            'attributes' => [
                'title' => $this->title,
                'position' => $this->position,
                'description' => $this->description,
                'responsibilities' => $this->responsibilities,
                'qualifications' => $this->qualifications,
                'requiredSkills' => $this->required_skills,
                'requiredCourse' => $this->required_course,
                'requiredYearLevel' => $this->required_year_level,
                'slots' => $this->slots,
                'durationMonths' => $this->duration_months,
                'requiredHours' => $this->required_hours,
                'location' => $this->location,
                'workSetup' => $this->work_setup,
                'isPaid' => (bool) $this->is_paid,
                'allowance' => $this->allowance,
                'applicationDeadline' => $this->application_deadline?->toDateString(),
                'status' => $this->status,
            ],
            'company' => $this->whenLoaded('companyProfile', fn () => [
                'id' => $this->companyProfile->id,
                'name' => $this->companyProfile->company_name,
                'industry' => $this->companyProfile->industry,
            ]),
        ];
    }
}
