<?php

namespace App\Mail;

use App\Models\CharityDonation;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class CharityDonationDonorMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public CharityDonation $donation,
    ) {}

    public function build(): self
    {
        $campaign = $this->donation->campaign;
        $amount = number_format((float) $this->donation->amount, 2, ',', '.');

        return $this->subject("Doação confirmada: R$ {$amount} — {$campaign?->title}")
            ->markdown('emails.charity-campaign-donation-donor', [
                'donation' => $this->donation,
                'myDonationsUrl' => route('mobile.donations.my-donations', absolute: true),
            ]);
    }
}
