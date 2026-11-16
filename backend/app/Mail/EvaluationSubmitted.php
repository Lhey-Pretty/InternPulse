<?php

namespace App\Mail;

use App\Models\Evaluation;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class EvaluationSubmitted extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Evaluation $evaluation
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Performance Evaluation Submitted: '.ucfirst($this->evaluation->evaluation_type),
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.evaluation-submitted',
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
