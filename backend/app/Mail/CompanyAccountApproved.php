<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class CompanyAccountApproved extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $contactPerson,
        public string $companyName
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Your company account is approved');
    }

    public function content(): Content
    {
        return new Content(view: 'emails.company-account-approved');
    }
}
