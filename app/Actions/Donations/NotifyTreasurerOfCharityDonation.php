<?php

namespace App\Actions\Donations;

use App\Mail\CharityDonationTreasurerMail;
use App\Models\CharityDonation;
use App\Models\Church;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class NotifyTreasurerOfCharityDonation
{
    public function handle(CharityDonation $donation): void
    {
        $donation->loadMissing(['campaign.church', 'user']);

        $church = $donation->campaign?->church;
        if (! $church instanceof Church) {
            return;
        }

        $email = trim((string) ($church->treasurer_notification_email ?? ''));
        if ($email === '' || ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return;
        }

        try {
            Mail::to($email)->send(new CharityDonationTreasurerMail($donation));
        } catch (\Throwable $e) {
            Log::warning('Falha ao enviar e-mail de doação ao tesoureiro.', [
                'donation_id' => $donation->id,
                'email' => $email,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
