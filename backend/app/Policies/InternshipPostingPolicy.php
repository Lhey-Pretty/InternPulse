<?php

namespace App\Policies;

use App\Models\InternshipPosting;
use App\Models\User;

class InternshipPostingPolicy
{
    public function update(User $user, InternshipPosting $internshipPosting): bool
    {
        return $user->isAdmin() || ($user->isCompany() && $user->companyProfile?->id === $internshipPosting->company_profile_id);
    }

    public function delete(User $user, InternshipPosting $internshipPosting): bool
    {
        return $user->isAdmin() || ($user->isCompany() && $user->companyProfile?->id === $internshipPosting->company_profile_id);
    }
}
