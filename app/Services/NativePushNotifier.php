<?php

namespace App\Services;

use App\Models\PushToken;
use App\Models\User;
use App\Support\UserMessagingPreferences;

class NativePushNotifier
{
    public function __construct(
        private readonly FcmMessaging $fcm = new FcmMessaging,
    ) {}

    public function isEnabled(): bool
    {
        return FcmMessaging::enabled();
    }

    /**
     * Envia push visível para todos os dispositivos registrados do usuário.
     *
     * @return int Quantidade de envios FCM bem-sucedidos
     */
    public function notifyUser(int $userId, string $title, string $body, array $data = []): int
    {
        if (! $this->isEnabled()) {
            return 0;
        }

        $user = User::query()->find($userId);
        if (! UserMessagingPreferences::acceptsInbox($user)) {
            return 0;
        }

        return $this->sendToTokens(
            PushToken::query()->where('user_id', $userId)->pluck('token'),
            $title,
            $body,
            $data,
        );
    }

    /**
     * Broadcast da igreja (notificações gerais do app).
     *
     * @return int Quantidade de envios FCM bem-sucedidos
     */
    public function notifyChurchBroadcast(?int $churchId, string $title, string $body, array $data = []): int
    {
        if (! $this->isEnabled()) {
            return 0;
        }

        $userIds = User::query()
            ->where('notify_via_app', true)
            ->whereHas('pushTokens')
            ->when($churchId !== null, fn ($q) => $q->where('church_id', (int) $churchId))
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->values()
            ->all();

        if ($userIds === []) {
            return 0;
        }

        return $this->sendToTokens(
            PushToken::query()->whereIn('user_id', $userIds)->pluck('token'),
            $title,
            $body,
            $data,
        );
    }

    /**
     * @param  iterable<int, string>  $tokens
     */
    private function sendToTokens(iterable $tokens, string $title, string $body, array $data): int
    {
        $sent = 0;

        foreach ($tokens as $token) {
            $token = (string) $token;
            if ($token === '') {
                continue;
            }

            if ($this->fcm->sendVisibleNotification($token, $title, $body, $data)) {
                $sent++;
            }
        }

        return $sent;
    }
}
