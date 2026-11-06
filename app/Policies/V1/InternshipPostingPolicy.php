<?php

namespace App\Policies\V1;

use App\Models\InternshipPosting;
use App\Models\User;
use App\Permissions\V1\Abilities;

/**
 * Authorization rules for internship postings based on token abilities.
 */
// Step 24: Principle of least privilege (deny by default)
class InternshipPostingPolicy
{
    /**
     * May this user create an internship posting? Needs the broad or the "own" create ability.
     */
    public function store(User $user): bool
    {
        return $user->tokenCan(Abilities::CreateInternship) ||
               $user->tokenCan(Abilities::CreateOwnInternship);
    }

    /**
     * May this user update this internship posting (PATCH)?
     */
    public function update(User $user, InternshipPosting $posting): bool
    {
        // Broad ability: any posting
        if ($user->tokenCan(Abilities::UpdateInternship) || $user->tokenCan(Abilities::UpdateOwnInternship)) {
            // Broad ability handled above, own ability checked here
            $ownerId = $posting->companyProfile?->user_id
                ?? $posting->author?->id
                ?? ($posting->user_id ?? null);

            return $user->id === $ownerId;
        }

        return false;
    }

    /**
     * May this user replace this internship posting (PUT)? Managers only.
     */
    public function replace(User $user, InternshipPosting $posting): bool
    {
        return $user->tokenCan(Abilities::ReplaceProduct) ||
               $user->tokenCan(Abilities::ReplaceInternship);
    }

    /**
     * May this user delete this internship posting?
     */
    public function delete(User $user, InternshipPosting $posting): bool
    {
        // Broad ability: any posting
        if ($user->tokenCan(Abilities::DeleteProduct) || $user->tokenCan(Abilities::DeleteInternship)) {
            return true;
        }

        // "Own" ability: only a posting the user owns
        if ($user->tokenCan(Abilities::DeleteOwnProduct) || $user->tokenCan(Abilities::DeleteOwnInternship)) {
            $ownerId = $posting->companyProfile?->user_id
                ?? $posting->author?->id
                ?? ($posting->user_id ?? null);

            return $user->id === $ownerId;
        }

        return false;
    }
}
