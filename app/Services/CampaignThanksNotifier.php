<?php

namespace App\Services;

use App\Mail\CampaignThanksDonorMail;
use App\Models\CampaignDonation;
use App\Models\DonationCampaign;
use App\Models\User;
use App\Models\UserInboxNotification;
use App\Support\UserMessagingPreferences;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class CampaignThanksNotifier
{
    /**
     * @return array{users_notified: int, emails_sent: int}
     */
    public function notifyAllDonors(DonationCampaign $campaign): array
    {
        $campaign->loadMissing(['church']);

        $userIds = CampaignDonation::query()
            ->where('campaign_id', $campaign->id)
            ->whereNotNull('user_id')
            ->distinct()
            ->pluck('user_id');

        $usersNotified = 0;
        $emailsSent = 0;

        foreach ($userIds as $userId) {
            $user = User::query()->find($userId);
            if (! $user instanceof User) {
                continue;
            }

            if ($this->pushInbox($user, $campaign)) {
                $usersNotified++;
            }

            if ($this->sendEmail($user, $campaign)) {
                $emailsSent++;
            }
        }

        if ($usersNotified > 0 || $emailsSent > 0) {
            $campaign->update(['thanks_donors_notified_at' => now()]);
        }

        return [
            'users_notified' => $usersNotified,
            'emails_sent' => $emailsSent,
        ];
    }

    private function pushInbox(User $user, DonationCampaign $campaign): bool
    {
        if (! Schema::hasTable('user_inbox_notifications')) {
            return false;
        }

        if (! UserMessagingPreferences::acceptsInbox($user)) {
            return false;
        }

        $title = 'Agradecimento pela sua doação';
        $excerpt = Str::limit(trim((string) ($campaign->thanks_message ?? '')), 160);
        $body = 'A campanha «'.$campaign->title.'» encerrou. '.$excerpt;

        $row = UserInboxNotification::create([
            'user_id' => $user->id,
            'title' => $title,
            'body' => $body,
            'action_url' => null,
        ]);

        $row->update([
            'action_url' => route('mobile.campaigns.show', ['donationCampaign' => $campaign->id, 'inbox' => $row->id], absolute: true),
        ]);

        return true;
    }

    private function sendEmail(User $user, DonationCampaign $campaign): bool
    {
        if (! UserMessagingPreferences::acceptsAccountEmail($user)) {
            return false;
        }

        $email = trim((string) ($user->email ?? ''));
        if ($email === '' || ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return false;
        }

        try {
            Mail::to($email)->send(new CampaignThanksDonorMail($campaign, $user));
        } catch (\Throwable $e) {
            Log::warning('Falha ao enviar e-mail de agradecimento ao doador.', [
                'campaign_id' => $campaign->id,
                'user_id' => $user->id,
                'email' => $email,
                'error' => $e->getMessage(),
            ]);

            return false;
        }

        return true;
    }
}
