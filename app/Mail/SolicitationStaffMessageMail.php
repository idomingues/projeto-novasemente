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
        public bool $isLeaderChat = false,
    ) {}

    public function build(): self
    {
        $prefix = $this->isLeaderChat ? 'Nova mensagem do líder' : 'Nova mensagem da igreja';

        return $this->subject($prefix.' — '.$this->typeLabel)
            ->markdown('emails.solicitation-staff-message');
    }
}
