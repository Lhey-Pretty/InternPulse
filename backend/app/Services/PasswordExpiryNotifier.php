<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\SystemSetting;
use App\Models\User;
use Carbon\CarbonInterface;

class PasswordExpiryNotifier
{
    public function notify(User $user): int
    {
        $expiryDays = (int) SystemSetting::get('password_expiry_days', 90);
        if ($expiryDays <= 0 || ! $user->password_changed_at || ! $user->is_active) {
            return 0;
        }

        $expiresAt = $user->password_changed_at->copy()->addDays($expiryDays);
        $notifications = 0;

        if ($expiresAt->toDateString() === today()->addDays(7)->toDateString()) {
            $notifications += $this->sendOnce(
                $user,
                $expiresAt,
                'seven_days',
                'Password change reminder in 7 days',
                'Your next password update reminder is on '.$expiresAt->format('M j, Y').'. You can change your password in account settings.',
            );
        }

        if ($expiresAt->isToday() || $expiresAt->isPast()) {
            $message = $expiresAt->isPast()
                ? 'Your password update reminder was due on '.$expiresAt->format('M j, Y').'. You can change your password in account settings.'
                : 'This is a reminder to update your password. You can change it in account settings.';

            $notifications += $this->sendOnce(
                $user,
                $expiresAt,
                'expires_today',
                'Password change reminder',
                $message,
            );
        }

        return $notifications;
    }

    private function sendOnce(
        User $user,
        CarbonInterface $expiresAt,
        string $noticeKind,
        string $title,
        string $message,
    ): int {
        $expiryKey = $expiresAt->toIso8601String();
        $alreadySent = Notification::query()
            ->where('user_id', $user->id)
            ->where('type', 'password_expiry')
            ->where('data->expires_at', $expiryKey)
            ->where('data->notice_kind', $noticeKind)
            ->exists();

        if ($alreadySent) {
            return 0;
        }

        Notification::send($user->id, 'password_expiry', $title, $message, [
            'expires_at' => $expiryKey,
            'notice_kind' => $noticeKind,
        ]);

        return 1;
    }
}
