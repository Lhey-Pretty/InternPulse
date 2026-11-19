<?php

namespace App\Policies\V1;

use App\Models\User;
use App\Permissions\V1\Abilities;

/**
 * Authorization rules for managing users. Only users holding the user:* abilities
 * (managers) pass these checks.
 */
class UserPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isAdmin() || $user->is_manager;
    }

    public function view(User $user, User $model): bool
    {
        return $user->id === $model->id || $user->isAdmin() || $user->is_manager;
    }

    // May the logged-in user create a new user?
    public function store(User $user): bool
    {
        return $user->is_manager && $user->tokenCan(Abilities::CreateUser);
    }

    // May the logged-in user update (PATCH) the user $model?
    public function update(User $user, User $model): bool
    {
        return $user->is_manager && $user->tokenCan(Abilities::UpdateUser);
    }

    // May the logged-in user replace (PUT) the user $model?
    public function replace(User $user, User $model): bool
    {
        return $user->is_manager && $user->tokenCan(Abilities::ReplaceUser);
    }

    // May the logged-in user delete the user $model?
    public function delete(User $user, User $model): bool
    {
        return $user->is_manager && $user->tokenCan(Abilities::DeleteUser);
    }
}
