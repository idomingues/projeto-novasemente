<?php

namespace App\Mail;

use App\Models\MissionVolunteer;
use App\Support\MissionVolunteerInstructions;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class MissionVolunteerInstructionsMail extends Mailable
{
    use Queueable, SerializesModels;

    /** @var list<string> */
    public array $instructionLines;

    public function __construct(
        public MissionVolunteer $volunteer,
    ) {
        $this->instructionLines = MissionVolunteerInstructions::lines();
    }

    public function envelope(): Envelope
    {
        $church = $this->volunteer->church?->name ?? 'Nova Semente';

        return new Envelope(
            subject: "Missão — próximos passos | {$church}",
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.mission-volunteer-instructions',
            with: [
                'volunteerName' => $this->volunteer->full_name,
                'churchName' => $this->volunteer->church?->name ?? 'Nova Semente',
                'instructionLines' => $this->instructionLines,
            ],
        );
    }
}
