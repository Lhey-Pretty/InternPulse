<?php

namespace App\Policies;

use App\Models\Application;
use App\Models\User;

class ApplicationPolicy
{
    public function view(User $user, Application $application): bool
    {
        if ($user->isAdmin() || $user->isCoordinator()) {
            return true;
        }

        if ($user->isStudent() && $user->studentProfile?->id === $application->student_profile_id) {
            return true;
        }

        if ($user->isCompany() && $application->internshipPosting?->company_profile_id === $user->companyProfile?->id) {
            return true;
        }

        return false;
    }

    public function withdraw(User $user, Application $application): bool
    {
        return $user->isStudent()
            && $user->studentProfile?->id === $application->student_profile_id
            && in_array($application->status, ['pending', 'shortlisted']);
    }
}
