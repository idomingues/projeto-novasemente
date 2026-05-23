<?php

namespace App\Mail;

use App\Models\DonationCampaign;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class CampaignThanksDonorMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public DonationCampaign $campaign,
        public User $donor,
    ) {}

    public function build(): self
    {
        return $this->subject('Agradecimento — '.$this->campaign->title)
            ->markdown('emails.campaign-thanks-donor', [
                'campaign' => $this->campaign,
                'donor' => $this->donor,
                'campaignUrl' => route('mobile.campaigns.show', $this->campaign, absolute: true),
            ]);
    }
}
