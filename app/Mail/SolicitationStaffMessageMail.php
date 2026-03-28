<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class SolicitationStaffMessageMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $typeLabel,
        public string $messageContent,
        public string $conversationUrl,
    ) {}

    public function build(): self
    {
        return $this->subject('Nova mensagem da igreja — '.$this->typeLabel)
            ->markdown('emails.solicitation-staff-message');
    }
}
