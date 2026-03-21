<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class ScheduleCheckinEnabledMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $dateLabel,
        public string $actionUrl,
    ) {}

    public function build(): self
    {
        return $this->subject('Check-in liberado — '.$this->dateLabel)
            ->markdown('emails.schedule-checkin-enabled');
    }
}
