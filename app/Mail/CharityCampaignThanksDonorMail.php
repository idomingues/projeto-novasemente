<?php

namespace App\Mail;

use App\Models\CharityCampaign;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class CharityCampaignThanksDonorMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public CharityCampaign $campaign,
        public User $donor,
    ) {}

    public function build(): self
    {
        return $this->subject('Agradecimento — '.$this->campaign->title)
            ->markdown('emails.charity-campaign-thanks-donor', [
                'campaign' => $this->campaign,
                'donor' => $this->donor,
                'campaignUrl' => route('mobile.donations.show', $this->campaign, absolute: true),
            ]);
    }
}
