<?php

namespace App\Permissions\V1;

use App\Models\User;

/**
 * Every ability name in one place, plus the rule that decides who receives which.
 * Format: resource:action. "own" means "only for things I own".
 */
final class Abilities
{
    // Internship abilities (InternPulse naming)
    public const CreateInternship = 'internship:create';
    public const CreateOwnInternship = 'internship:own:create';
    public const UpdateInternship = 'internship:update';
    public const UpdateOwnInternship = 'internship:own:update';
    public const ReplaceInternship = 'internship:replace';
    public const DeleteInternship = 'internship:delete';
    public const DeleteOwnInternship = 'internship:own:delete';

    // User management abilities (managers only)
    public const CreateUser = 'user:create';
    public const UpdateUser = 'user:update';
    public const ReplaceUser = 'user:replace';
    public const DeleteUser = 'user:delete';

    /**
     * Returns the list of abilities a user receives.
     */
    public static function getAbilities(User $user): array
    {
        // Managers may act on anything
        if ($user->is_manager) {
            return [
                self::CreateInternship,
                self::UpdateInternship,
                self::ReplaceInternship,
                self::DeleteInternship,
                self::CreateUser,
                self::UpdateUser,
                self::ReplaceUser,
                self::DeleteUser,
            ];
        }

        // Regular users may only act on their own internships
        return [
            self::CreateOwnInternship,
            self::UpdateOwnInternship,
            self::DeleteOwnInternship,
        ];
    }
}
