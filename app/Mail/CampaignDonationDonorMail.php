<?php

namespace App\Mail;

use App\Models\CampaignDonation;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class CampaignDonationDonorMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public CampaignDonation $donation,
    ) {}

    public function build(): self
    {
        $campaign = $this->donation->campaign;
        $amount = number_format((float) $this->donation->amount, 2, ',', '.');

        return $this->subject("Contribuição confirmada: R$ {$amount} — {$campaign?->title}")
            ->markdown('emails.campaign-donation-donor', [
                'donation' => $this->donation,
                'myDonationsUrl' => route('mobile.campaigns.my-donations', absolute: true),
            ]);
    }
}
