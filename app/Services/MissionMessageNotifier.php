<?php

namespace App\Services;

use App\Models\MissionMessage;
use App\Models\User;
use App\Models\UserInboxNotification;
use App\Support\SafeSpatieUsersByPermission;
use App\Support\UserMessagingPreferences;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;

class MissionMessageNotifier
{
    public function notifyModeratorsOfPendingMessage(MissionMessage $message): void
    {
        if ($message->moderation_status !== MissionMessage::STATUS_PENDING_REVIEW) {
            return;
        }

        $message->loadMissing(['user:id,name']);

        $authorName = $message->user?->name ?? 'Um membro';
        $preview = mb_strlen($message->body) > 120
            ? mb_substr($message->body, 0, 117).'…'
            : $message->body;

        foreach ($this->moderatorsForChurch((int) $message->church_id, (int) $message->user_id) as $moderator) {
            $this->pushInbox(
                $moderator,
                'Depoimento aguardando análise',
                $authorName.' enviou um depoimento que precisa de revisão antes de ir ao mural: «'.$preview.'»',
                'mission.content.messages',
                ['filter' => 'pending'],
            );
        }
    }

    public function notifyAuthorOfDecision(MissionMessage $message, string $decision): void
    {
        $message->loadMissing(['user:id,name']);

        $author = $message->user;
        if (! $author instanceof User) {
            return;
        }

        [$title, $body] = match ($decision) {
            'approved' => [
                'Depoimento aprovado',
                'Seu depoimento na Missão foi aprovado e já está visível para a comunidade.',
            ],
            'rejected' => [
                'Depoimento não publicado',
                'Seu depoimento não foi publicado porque não está de acordo com as diretrizes da comunidade. '
                    .'Se tiver dúvidas, fale com a equipe missionária.',
            ],
            default => [
                'Atualização do seu depoimento',
                'Houve uma atualização na moderação do seu depoimento na Missão.',
            ],
        };

        $this->pushInbox(
            $author,
            $title,
            $body,
            'mobile.mission.messages',
            [],
        );
    }

    /**
     * @param  array<string, mixed>  $routeParams
     */
    private function pushInbox(User $user, string $title, string $body, string $routeName, array $routeParams): void
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

        try {
            $row->update([
                'action_url' => route($routeName, array_merge($routeParams, ['inbox' => $row->id]), absolute: true),
            ]);
        } catch (\Throwable $e) {
            Log::warning('Não foi possível gerar link da notificação de depoimento.', [
                'route' => $routeName,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * @return Collection<int, User>
     */
    private function moderatorsForChurch(int $churchId, int $excludeUserId): Collection
    {
        return SafeSpatieUsersByPermission::usersHavingAnyPermissionOrAdmins(
            ['mission.manage'],
            $excludeUserId,
        )->filter(function (User $user) use ($churchId) {
            if ($user->hasRole('super_admin')) {
                return true;
            }

            return (int) $user->church_id === $churchId;
        })->unique('id')->values();
    }
}
