<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class SolicitationNewRequestMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $emailSubject,
        public string $headline,
        public string $introLine,
        public string $messagePreview,
        public string $inboxUrl,
    ) {}

    public function build(): self
    {
        return $this->subject($this->emailSubject)
            ->markdown('emails.solicitation-new-request');
    }
}
