<?php

namespace App\Support;

use App\Models\AppNotification;
use App\Models\User;
use App\Models\UserDismissedAppNotification;
use App\Models\UserInboxNotification;
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
     * @return array<int, array{id: string, title: string, body: string, created_at: string, author: mixed, href: string, kind: string, inbox_notification_id?: int, inbox_unread?: bool, app_notification_id?: int, can_remove?: bool}>
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
                'href' => route('varios.notifications'),
                'kind' => 'app',
                'app_notification_id' => (int) $n['id'],
                'can_remove' => $user !== null,
            ]);

        $inbox = collect();
        if ($request->user()) {
            $inbox = UserInboxNotification::forUser($request->user(), $limit)->map(function (UserInboxNotification $n) use ($request) {
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
                    'inbox_notification_id' => $n->id,
                    'inbox_unread' => $n->read_at === null,
                    'can_remove' => true,
                ];
            });
        }

        return $app->concat($inbox)->sortByDesc('created_at')->take($limit)->values()->all();
    }

    /**
     * Total de entradas que entram no feed (igreja + globais + caixa pessoal), para badges no perfil móvel.
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
            $inboxCount = (int) UserInboxNotification::query()
                ->where('user_id', $request->user()->id)
                ->count();
        }

        return $appCount + $inboxCount;
    }

    public static function unreadInboxCount(Request $request): int
    {
        if (! $request->user()) {
            return 0;
        }

        return UserInboxNotification::query()
            ->where('user_id', $request->user()->id)
            ->whereNull('read_at')
            ->count();
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
