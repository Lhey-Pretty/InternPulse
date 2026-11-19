<?php

namespace App\Mail;

use App\Models\Application;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ApplicationStatusChanged extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Application $application,
        public string $previousStatus,
        public string $newStatus
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Application Status Update: '.ucfirst(str_replace('_', ' ', $this->newStatus)),
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.application-status-changed',
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
