<?php

namespace App\Mail;

use App\Models\MissionInvitation;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class MissionVolunteerInviteMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public MissionInvitation $invitation,
        public string $formUrl,
    ) {}

    public function envelope(): Envelope
    {
        $church = $this->invitation->volunteer->church?->name ?? 'Nova Semente';

        return new Envelope(
            subject: "Missão — {$church}",
        );
    }

    public function content(): Content
    {
        $volunteer = $this->invitation->volunteer;
        $churchName = $volunteer->church?->name ?? 'Nova Semente';

        return new Content(
            markdown: 'emails.mission-volunteer-invite',
            with: [
                'volunteerName' => $volunteer->full_name,
                'churchName' => $churchName,
                'formUrl' => $this->formUrl,
            ],
        );
    }
}
