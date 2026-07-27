<?php

namespace App\Support;

use App\Models\AppNotification;
use App\Models\User;
use App\Models\UserDismissedAppNotification;
use App\Models\UserInboxNotification;
use App\Support\LeaderOperationalNotifications;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

class NotificationFeed
{
    /**
     * Converte URL absoluta da mesma origem do pedido para path + query (melhor para visitas Inertia).
     */
    public static function inertiaHrefFromStoredUrl(Request $request, string $absoluteOrRelative): string
    {
        if ($absoluteOrRelative === '' || str_starts_with($absoluteOrRelative, '/')) {
            return $absoluteOrRelative;
        }

        $prefix = $request->getSchemeAndHttpHost();
        if (str_starts_with($absoluteOrRelative, $prefix)) {
            $path = substr($absoluteOrRelative, strlen($prefix));

            return $path === '' || $path === false ? '/' : $path;
        }

        return $absoluteOrRelative;
    }

    /**
     * @return array<int, array{id: string, title: string, body: string, created_at: string, author: mixed, href: string, kind: string, intent: string, inbox_notification_id?: int, inbox_unread?: bool, app_notification_id?: int, can_remove?: bool}>
     */
    public static function mergedForUser(Request $request, ?int $churchId, int $limit = 50): array
    {
        $user = $request->user();
        $dismissedAppIds = self::dismissedAppNotificationIdsForUser($user);
        $visibleSince = $user?->created_at;

        $app = AppNotification::recentForChurch($churchId, $limit, $visibleSince)
            ->reject(fn (array $n) => in_array((int) $n['id'], $dismissedAppIds, true))
            ->map(fn (array $n) => [
                'id' => 'app-'.$n['id'],
                'title' => $n['title'],
                'body' => $n['body'],
                'created_at' => $n['created_at'],
                'author' => $n['author'] ?? null,
                'href' => is_string($n['action_url'] ?? null) && ($n['action_url'] ?? '') !== ''
                    ? self::inertiaHrefFromStoredUrl($request, (string) $n['action_url'])
                    : route('varios.notifications'),
                'kind' => 'app',
                'intent' => UserInboxNotification::INTENT_INFO,
                'app_notification_id' => (int) $n['id'],
                'can_remove' => $user !== null,
            ]);

        $inbox = collect();
        if ($request->user()) {
            $viewer = $request->user();
            $inbox = UserInboxNotification::forUser($viewer, $limit)
                ->reject(fn (UserInboxNotification $n) => LeaderOperationalNotifications::shouldHideFromUser($viewer, $n))
                ->map(function (UserInboxNotification $n) use ($request) {
                    $raw = $n->action_url;
                    $href = is_string($raw) && $raw !== ''
                        ? self::inertiaHrefFromStoredUrl($request, $raw)
                        : route('mobile.notifications');

                    return [
                        'id' => 'inbox-'.$n->id,
                        'title' => $n->title,
                        'body' => $n->body,
                        'created_at' => $n->created_at->toIso8601String(),
                        'author' => null,
                        'href' => $href,
                        'kind' => 'inbox',
                        'intent' => UserInboxNotification::normalizeIntent(
                            is_string($n->intent) ? $n->intent : null,
                        ),
                        'inbox_notification_id' => $n->id,
                        'inbox_unread' => $n->read_at === null,
                        'can_remove' => true,
                    ];
                });
        }

        return $app->concat($inbox)
            ->sortByDesc('created_at')
            ->values()
            ->reduce(function ($carry, array $n) {
                $isDuplicate = $carry->contains(function (array $existing) use ($n) {
                    if ($existing['kind'] !== $n['kind']
                        || $existing['title'] !== $n['title']
                        || $existing['body'] !== $n['body']) {
                        return false;
                    }

                    $existingTs = strtotime((string) $existing['created_at']) ?: 0;
                    $nextTs = strtotime((string) $n['created_at']) ?: 0;

                    return abs($existingTs - $nextTs) <= 300;
                });

                return $isDuplicate ? $carry : $carry->push($n);
            }, collect())
            ->take($limit)
            ->values()
            ->all();
    }

    /**
     * Total de entradas que entram no feed (igreja + globais + caixa pessoal).
     */
    public static function mergedTotalCountForUser(Request $request, ?int $churchId): int
    {
        $user = $request->user();
        $dismissedAppIds = self::dismissedAppNotificationIdsForUser($user);
        $visibleSince = $user?->created_at;

        $appCount = 0;
        if (Schema::hasTable('app_notifications')) {
            $appCount = (int) AppNotification::query()
                ->where(function ($q) use ($churchId) {
                    $q->whereNull('church_id');
                    if ($churchId !== null) {
                        $q->orWhere('church_id', $churchId);
                    }
                })
                ->when($visibleSince !== null, fn ($q) => $q->where('created_at', '>=', $visibleSince))
                ->when($dismissedAppIds !== [], fn ($q) => $q->whereNotIn('id', $dismissedAppIds))
                ->count();
        }

        $inboxCount = 0;
        if ($request->user() && Schema::hasTable('user_inbox_notifications')) {
            $viewer = $request->user();
            $inboxCount = (int) UserInboxNotification::query()
                ->where('user_id', $viewer->id)
                ->get()
                ->reject(fn (UserInboxNotification $n) => LeaderOperationalNotifications::shouldHideFromUser($viewer, $n))
                ->count();
        }

        return $appCount + $inboxCount;
    }

    /**
     * Badge do sino / pasta «Não lidas»: tipos de aviso pessoal ainda sem leitura
     * (agrupa várias linhas com o mesmo título — ex.: vários «Novo voluntário…»).
     */
    public static function unreadInboxCount(Request $request): int
    {
        $viewer = $request->user();
        if ($viewer === null || ! Schema::hasTable('user_inbox_notifications')) {
            return 0;
        }

        return (int) UserInboxNotification::query()
            ->where('user_id', $viewer->id)
            ->whereNull('read_at')
            ->get()
            ->reject(fn (UserInboxNotification $n) => LeaderOperationalNotifications::shouldHideFromUser($viewer, $n))
            ->unique(fn (UserInboxNotification $n) => (string) $n->title)
            ->count();
    }

    /**
     * Não lidas para o sino: a mais recente de cada título (ordem cronológica).
     *
     * @return array<int, array{id: string, title: string, body: string, created_at: string, author: mixed, href: string, kind: string, intent: string, inbox_notification_id?: int, inbox_unread?: bool, can_remove?: bool, inbox_group_count?: int}>
     */
    public static function unreadInboxGroupedForUser(Request $request, int $limit = 24): array
    {
        $user = $request->user();
        if ($user === null || ! Schema::hasTable('user_inbox_notifications')) {
            return [];
        }

        $rows = UserInboxNotification::query()
            ->where('user_id', $user->id)
            ->whereNull('read_at')
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->get()
            ->reject(fn (UserInboxNotification $n) => LeaderOperationalNotifications::shouldHideFromUser($user, $n));

        $grouped = [];
        foreach ($rows as $n) {
            $title = (string) $n->title;
            if (isset($grouped[$title])) {
                $grouped[$title]['inbox_group_count'] = (int) $grouped[$title]['inbox_group_count'] + 1;

                continue;
            }

            $raw = $n->action_url;
            $href = is_string($raw) && $raw !== ''
                ? self::inertiaHrefFromStoredUrl($request, $raw)
                : route('mobile.notifications');

            $grouped[$title] = [
                'id' => 'inbox-'.$n->id,
                'title' => $n->title,
                'body' => $n->body,
                'created_at' => $n->created_at->toIso8601String(),
                'author' => null,
                'href' => $href,
                'kind' => 'inbox',
                'intent' => UserInboxNotification::normalizeIntent(
                    is_string($n->intent) ? $n->intent : null,
                ),
                'inbox_notification_id' => $n->id,
                'inbox_unread' => true,
                'can_remove' => true,
                'inbox_group_count' => 1,
            ];
        }

        $items = array_values($grouped);
        usort($items, function (array $a, array $b): int {
            $aTs = strtotime((string) $a['created_at']) ?: 0;
            $bTs = strtotime((string) $b['created_at']) ?: 0;

            return $bTs <=> $aTs;
        });

        return array_slice($items, 0, $limit);
    }

    /**
     * @return list<int>
     */
    private static function dismissedAppNotificationIdsForUser(?User $user): array
    {
        if ($user === null || ! Schema::hasTable('user_dismissed_app_notifications')) {
            return [];
        }

        return UserDismissedAppNotification::query()
            ->where('user_id', $user->id)
            ->pluck('app_notification_id')
            ->map(fn ($id) => (int) $id)
            ->values()
            ->all();
    }
}
