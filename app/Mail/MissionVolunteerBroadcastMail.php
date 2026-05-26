<?php

namespace App\Mail;

use App\Models\Church;
use App\Models\MissionVolunteer;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class MissionVolunteerBroadcastMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public MissionVolunteer $volunteer,
        public Church $church,
        public string $messageTitle,
        public string $messageBody,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: $this->messageTitle,
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.mission-volunteer-broadcast',
            with: [
                'volunteerName' => $this->volunteer->full_name,
                'churchName' => $this->church->name,
                'messageTitle' => $this->messageTitle,
                'messageBody' => $this->messageBody,
            ],
        );
    }
}
