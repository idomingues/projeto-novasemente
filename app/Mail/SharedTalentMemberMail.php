<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class SharedTalentMemberMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $emailSubject,
        public string $headline,
        public string $introLine,
        public string $detailBlock,
        public string $actionUrl,
        public string $buttonLabel = 'Abrir na app',
    ) {}

    public function build(): self
    {
        return $this->subject($this->emailSubject)
            ->markdown('emails.shared-talent-member');
    }
}
