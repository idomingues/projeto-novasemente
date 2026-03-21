<?php

namespace App\Support;

use App\Models\AppNotification;
use App\Models\UserInboxNotification;
use Illuminate\Http\Request;

class NotificationFeed
{
    /**
     * @return array<int, array{id: string, title: string, body: string, created_at: string, author: mixed, href: string, kind: string}>
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
            $inbox = UserInboxNotification::forUser($request->user(), $limit)->map(fn (UserInboxNotification $n) => [
                'id' => 'inbox-'.$n->id,
                'title' => $n->title,
                'body' => $n->body,
                'created_at' => $n->created_at->toIso8601String(),
                'author' => null,
                'href' => $n->action_url ?: route('mobile.notifications'),
                'kind' => 'inbox',
            ]);
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
