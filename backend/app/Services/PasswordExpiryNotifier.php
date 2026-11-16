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
                'Password expires in 7 days',
                'Your password expires on '.$expiresAt->format('M j, Y').'. Change it before then to keep uninterrupted access.',
            );
        }

        if ($expiresAt->isToday() || $expiresAt->isPast()) {
            $message = $expiresAt->isPast()
                ? 'Your password expired on '.$expiresAt->format('M j, Y').'. Change it to restore access to protected features.'
                : 'Your password expires today. Change it today to keep uninterrupted access.';

            $notifications += $this->sendOnce(
                $user,
                $expiresAt,
                'expires_today',
                'Password expires today',
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
