<?php

namespace App\Support;

use App\Models\AppNotification;
use App\Models\UserInboxNotification;
use Illuminate\Http\Request;

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
     * @return array<int, array{id: string, title: string, body: string, created_at: string, author: mixed, href: string, kind: string, inbox_notification_id?: int, inbox_unread?: bool}>
     */
    public static function mergedForUser(Request $request, ?int $churchId, int $limit = 50): array
    {
        $app = AppNotification::recentForChurch($churchId, $limit)->map(fn (array $n) => [
            'id' => 'app-'.$n['id'],
            'title' => $n['title'],
            'body' => $n['body'],
            'created_at' => $n['created_at'],
            'author' => $n['author'] ?? null,
            'href' => route('varios.notifications'),
            'kind' => 'app',
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
                ];
            });
        }

        return $app->concat($inbox)->sortByDesc('created_at')->take($limit)->values()->all();
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
}
