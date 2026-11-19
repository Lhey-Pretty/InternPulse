<?php

namespace App\Mail;

use App\Models\CompanyProfile;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class CompanyAccountCreated extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public User $user,
        public CompanyProfile $companyProfile,
        public ?string $temporaryPassword = null
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Welcome to InternPulse - Company Account Details',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.company-account-created',
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
