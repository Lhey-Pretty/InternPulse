<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\MailMessage;

class CustomResetPassword extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * The password reset token.
     */
    public string $token;

    /**
     * Create a new notification instance.
     */
    public function __construct(string $token)
    {
        $this->token = $token;
    }

    /**
     * Get the notification's delivery channels.
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    /**
     * Build the mail representation of the notification.
     */
    /**
     * Build the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        // Read the value from config, never env(): a long-running queue worker
        // (and config:cache) keeps the env snapshot from when it booted, which
        // produced reset links pointing at the wrong base path.
        $frontendUrl = rtrim((string) config('app.frontend_url'), '/');

        // Ensure the link is absolute even if only a path was configured.
        if (! preg_match('#^https?://#i', $frontendUrl)) {
            $frontendUrl = rtrim((string) config('app.url'), '/') . '/' . ltrim($frontendUrl, '/');
        }

        $url = $frontendUrl . '/reset-password?' . http_build_query([
            'token' => $this->token,
            'email' => $notifiable->getEmailForPasswordReset(),
        ]);

        return (new MailMessage)
            ->subject('Reset Password Notification')
            ->greeting('Hello!')
            ->line('You are receiving this email because we received a password reset request for your account.')
            ->action('Reset Password', $url)
            ->line('This password reset link will expire in 60 minutes.')
            // Only a single fallback line – the button already provides the link.
            ->line('If you’re having trouble clicking the "Reset Password" button, copy and paste the URL below into your web browser:')
            ->line($url)
            ->salutation('Regards,' . "\n" . config('app.name'));
    }
}
