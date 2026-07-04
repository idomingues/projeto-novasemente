<?php

namespace App\Mail;

use App\Models\CharityDonation;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class CharityDonationTreasurerMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public CharityDonation $donation,
    ) {}

    public function build(): self
    {
        $campaign = $this->donation->campaign;
        $amount = number_format((float) $this->donation->amount, 2, ',', '.');

        return $this->subject("Nova doação: R$ {$amount} — {$campaign?->title}")
            ->markdown('emails.charity-campaign-donation-treasurer', [
                'donation' => $this->donation,
                'dashboardUrl' => route('finance.charity-donations.index', absolute: true),
            ]);
    }
}
