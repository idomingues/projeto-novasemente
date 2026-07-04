<?php

namespace App\Actions\Donations;

use App\Mail\CharityDonationDonorMail;
use App\Models\CharityDonation;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class NotifyDonorOfCharityDonation
{
    public function handle(CharityDonation $donation): void
    {
        if (! $donation->donor_email_confirmation_requested) {
            return;
        }

        $donation->loadMissing(['campaign.church', 'user']);

        $email = trim((string) ($donation->user?->email ?? ''));
        if ($email === '' || ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return;
        }

        try {
            Mail::to($email)->send(new CharityDonationDonorMail($donation));
        } catch (\Throwable $e) {
            Log::warning('Falha ao enviar e-mail de confirmação ao doador.', [
                'donation_id' => $donation->id,
                'email' => $email,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
