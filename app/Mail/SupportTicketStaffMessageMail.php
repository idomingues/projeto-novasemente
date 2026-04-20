<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class SupportTicketStaffMessageMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $headline,
        public string $typeLabel,
        public string $messageContent,
        public string $conversationUrl,
        public ?string $staffDisplayName = null,
        public ?string $churchName = null,
    ) {}

    public function build(): self
    {
        return $this->subject($this->headline.' — '.$this->typeLabel)
            ->view('emails.support-ticket-staff-message');
    }
}
