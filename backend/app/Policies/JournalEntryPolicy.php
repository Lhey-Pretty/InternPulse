<?php

namespace App\Policies;

use App\Models\JournalEntry;
use App\Models\User;

class JournalEntryPolicy
{
    public function view(User $user, JournalEntry $journalEntry): bool
    {
        if ($user->isAdmin() || $user->isCoordinator()) {
            return true;
        }

        if ($user->isStudent() && $user->studentProfile?->id === $journalEntry->student_profile_id) {
            return true;
        }

        if ($user->isCompany() && $journalEntry->internshipPlacement?->internshipPosting?->company_profile_id === $user->companyProfile?->id) {
            return true;
        }

        return false;
    }

    public function update(User $user, JournalEntry $journalEntry): bool
    {
        return $user->isStudent()
            && $user->studentProfile?->id === $journalEntry->student_profile_id
            && $journalEntry->supervisor_approved_at === null;
    }

    public function delete(User $user, JournalEntry $journalEntry): bool
    {
        return $user->isStudent()
            && $user->studentProfile?->id === $journalEntry->student_profile_id
            && $journalEntry->supervisor_approved_at === null;
    }
}
