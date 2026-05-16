<?php

namespace App\Mail;

use App\Actions\Volunteers\BuildVolunteerMinistryInvitePlainCopy;
use App\Models\VolunteerMinistryInvitation;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class VolunteerMinistryInvitationMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public VolunteerMinistryInvitation $invitation,
        public string $actionUrl,
    ) {
        $this->invitation->loadMissing(['ministry', 'volunteer.user', 'slots', 'church']);
    }

    public function envelope(): Envelope
    {
        $ministry = (string) ($this->invitation->ministry?->name ?? 'Departamento');

        return new Envelope(
            subject: 'Convite para servir — '.$ministry,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.volunteer-ministry-invite',
            with: [
                'inv' => $this->invitation,
                'actionUrl' => $this->actionUrl,
                'plainCopySection' => BuildVolunteerMinistryInvitePlainCopy::for($this->invitation),
            ],
        );
    }
}
