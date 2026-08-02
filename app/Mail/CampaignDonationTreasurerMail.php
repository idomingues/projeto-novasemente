<?php

namespace App\Mail;

use App\Models\CampaignDonation;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class CampaignDonationTreasurerMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public CampaignDonation $donation,
    ) {}

    public function build(): self
    {
        $campaign = $this->donation->campaign;
        $amount = number_format((float) $this->donation->amount, 2, ',', '.');

        return $this->subject("Campanha «{$campaign?->title}»: nova contribuição de R$ {$amount}")
            ->markdown('emails.campaign-donation-treasurer', [
                'donation' => $this->donation,
                'dashboardUrl' => route('finance.treasurer', absolute: true),
            ]);
    }
}
