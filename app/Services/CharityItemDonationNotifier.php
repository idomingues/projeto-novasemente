<?php

namespace App\Services;

use App\Models\CharityCampaign;
use App\Models\CharityItemDonation;
use App\Models\Church;
use App\Models\User;
use App\Models\UserInboxNotification;
use App\Support\SafeSpatieUsersByPermission;
use App\Support\UserMessagingPreferences;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Schema;

class CharityItemDonationNotifier
{
    public function notifyStakeholdersOfNewPledge(CharityItemDonation $donation): void
    {
        if (! Schema::hasTable('user_inbox_notifications')) {
            return;
        }

        $donation->loadMissing(['campaign.church', 'campaign.author', 'user']);

        $campaign = $donation->campaign;
        if (! $campaign instanceof CharityCampaign) {
            return;
        }

        $church = $campaign->church;
        if (! $church instanceof Church) {
            return;
        }

        $churchId = (int) $campaign->church_id;
        $donorUserId = (int) $donation->user_id;
        $donorName = $donation->donorDisplayName();
        $campaignTitle = $campaign->title;
        $quantityLabel = $donation->quantityLabel();

        /** @var array<int, array{user: User, treasurer: bool, creator: bool}> $recipients */
        $recipients = [];

        foreach ($this->treasurersForChurch($churchId) as $user) {
            if ((int) $user->id === $donorUserId) {
                continue;
            }

            $recipients[$user->id] = [
                'user' => $user,
                'treasurer' => true,
                'creator' => false,
            ];
        }

        $creatorId = (int) ($campaign->created_by ?? 0);
        if ($creatorId > 0 && $creatorId !== $donorUserId) {
            $creator = $campaign->author ?? User::query()->find($creatorId);
            if ($creator instanceof User) {
                if (isset($recipients[$creatorId])) {
                    $recipients[$creatorId]['creator'] = true;
                } else {
                    $recipients[$creatorId] = [
                        'user' => $creator,
                        'treasurer' => false,
                        'creator' => true,
                    ];
                }
            }
        }

        foreach ($recipients as $entry) {
            $this->pushInbox(
                $entry['user'],
                $this->buildTitle($entry['treasurer'], $entry['creator']),
                $this->buildBody($entry['treasurer'], $entry['creator'], $quantityLabel, $donorName, $campaignTitle),
                $entry['treasurer'] ? 'finance.charity-donations.index' : 'charity-campaigns.index',
            );
        }
    }

    /**
     * @return Collection<int, User>
     */
    private function treasurersForChurch(int $churchId): Collection
    {
        return SafeSpatieUsersByPermission::usersHavingAnyPermissionOrAdmins(
            ['finance.view'],
        )->filter(function (User $user) use ($churchId) {
            if ($user->hasRole('super_admin')) {
                return true;
            }

            return (int) ($user->church_id ?? 0) === $churchId;
        })->values();
    }

    private function buildTitle(bool $treasurer, bool $creator): string
    {
        if ($treasurer && $creator) {
            return 'Nova promessa de doação';
        }
        if ($treasurer) {
            return 'Nova promessa registrada';
        }

        return 'Promessa na sua campanha';
    }

    private function buildBody(bool $treasurer, bool $creator, string $quantityLabel, string $donorName, string $campaignTitle): string
    {
        if ($treasurer && $creator) {
            return $quantityLabel.' prometidos na campanha «'.$campaignTitle.'» ('.$donorName.'). Você criou esta campanha e pode acompanhar o recebimento no painel.';
        }
        if ($treasurer) {
            return $quantityLabel.' prometidos na campanha «'.$campaignTitle.'» ('.$donorName.'). Toque para acompanhar o recebimento.';
        }

        return $quantityLabel.' prometidos na campanha «'.$campaignTitle.'» que você criou ('.$donorName.').';
    }

    private function pushInbox(User $user, string $title, string $body, string $routeName): void
    {
        if (! UserMessagingPreferences::acceptsInbox($user)) {
            return;
        }

        $row = UserInboxNotification::create([
            'user_id' => $user->id,
            'title' => $title,
            'body' => $body,
            'action_url' => null,
        ]);

        $row->update([
            'action_url' => route($routeName, ['inbox' => $row->id], absolute: true),
        ]);
    }
}
