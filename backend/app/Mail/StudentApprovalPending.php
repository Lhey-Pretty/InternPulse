<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class StudentApprovalPending extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public string $studentName, public string $program) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Student account approval in progress');
    }

    public function content(): Content
    {
        return new Content(view: 'emails.student-approval-pending');
    }
}
