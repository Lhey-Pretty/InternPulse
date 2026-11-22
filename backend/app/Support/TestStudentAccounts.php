<?php

namespace App\Support;

use App\Models\User;

class TestStudentAccounts
{
    public static function reason(User $user): ?string
    {
        if ($user->role !== 'student') {
            return null;
        }

        $profile = $user->studentProfile;
        $names = [
            $user->name,
            $profile?->first_name,
            $profile?->middle_name,
            $profile?->last_name,
        ];

        foreach ($names as $name) {
            // Match an actual Test/Test11 name marker, not names such as Contest.
            if (preg_match('/\btest\d*\b/iu', $name ?? '')) {
                return 'Test marker in student name';
            }
        }

        return null;
    }
}
