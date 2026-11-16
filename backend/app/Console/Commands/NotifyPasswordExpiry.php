<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Services\PasswordExpiryNotifier;
use Illuminate\Console\Command;

class NotifyPasswordExpiry extends Command
{
    protected $signature = 'passwords:notify-expiring';

    protected $description = 'Notify active users 7 days before password expiration and on expiration day';

    public function handle(PasswordExpiryNotifier $notifier): int
    {
        $notificationsSent = 0;

        User::query()
            ->where('is_active', true)
            ->whereNotNull('password_changed_at')
            ->chunkById(200, function ($users) use ($notifier, &$notificationsSent): void {
                foreach ($users as $user) {
                    $notificationsSent += $notifier->notify($user);
                }
            });

        $this->info("Sent {$notificationsSent} password-expiry notification(s).");

        return self::SUCCESS;
    }
}
