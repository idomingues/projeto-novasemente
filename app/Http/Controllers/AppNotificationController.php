<?php

namespace App\Http\Controllers;

use App\Models\AppNotification;
use App\Models\Church;
use App\Models\PushToken;
use App\Models\User;
use App\Services\FcmMessaging;
use Illuminate\Http\Request;

class AppNotificationController extends Controller
{
    private function currentChurchId(): ?int
    {
        return Church::resolveWorkingId(request());
    }

    public function store(Request $request)
    {
        $this->authorize('notifications.manage');

        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'body' => ['required', 'string', 'max:5000'],
        ]);

        $churchId = $this->currentChurchId();

        $notification = AppNotification::create([
            'church_id' => $churchId,
            'title' => $data['title'],
            'body' => $data['body'],
            'created_by' => $request->user()?->id,
        ]);

        $this->dispatchNativePushForNotification($notification);

        return redirect()->back()->with('success', 'Notificação enviada para todos os usuários do app.');
    }

    public function destroy(Request $request, AppNotification $notification)
    {
        $this->authorize('notifications.manage');

        $churchId = $this->currentChurchId();

        // Safety: only allow deleting notifications for the current church context (or global ones).
        if ($notification->church_id !== null && (int) $notification->church_id !== (int) $churchId) {
            abort(403);
        }

        $notification->delete();

        return redirect()->back()->with('success', 'Notificação excluída.');
    }

    private function dispatchNativePushForNotification(AppNotification $notification): void
    {
        if (! FcmMessaging::enabled()) {
            // #region agent log
            try {
                logger()->info('debug-5acbd2 FCM disabled; skipping native push dispatch', [
                    'runId' => 'pre-fix',
                    'hypothesisId' => 'H2',
                    'notification_id' => (string) $notification->id,
                ]);
            } catch (\Throwable) {
            }
            @file_put_contents(
                base_path('.cursor/debug-5acbd2.log'),
                json_encode([
                    'sessionId' => '5acbd2',
                    'runId' => 'pre-fix',
                    'hypothesisId' => 'H2',
                    'location' => 'app/Http/Controllers/AppNotificationController.php:dispatchNativePushForNotification',
                    'message' => 'FCM disabled; skipping native push dispatch',
                    'data' => [
                        'notification_id' => (string) $notification->id,
                    ],
                    'timestamp' => (int) round(microtime(true) * 1000),
                ], JSON_UNESCAPED_SLASHES)."\n",
                FILE_APPEND
            );

            // #endregion agent log
            return;
        }

        $churchId = $notification->church_id;

        $userIds = User::query()
            ->where('notify_via_app', true)
            ->whereHas('pushTokens')
            ->when($churchId !== null, fn ($q) => $q->where('church_id', (int) $churchId))
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->values()
            ->all();

        if ($userIds === []) {
            // #region agent log
            try {
                logger()->info('debug-5acbd2 No users with notify_via_app + pushTokens; skipping', [
                    'runId' => 'pre-fix',
                    'hypothesisId' => 'H3',
                    'notification_id' => (string) $notification->id,
                    'church_id' => $churchId === null ? null : (int) $churchId,
                ]);
            } catch (\Throwable) {
            }
            @file_put_contents(
                base_path('.cursor/debug-5acbd2.log'),
                json_encode([
                    'sessionId' => '5acbd2',
                    'runId' => 'pre-fix',
                    'hypothesisId' => 'H3',
                    'location' => 'app/Http/Controllers/AppNotificationController.php:dispatchNativePushForNotification',
                    'message' => 'No users with notify_via_app + pushTokens; skipping',
                    'data' => [
                        'notification_id' => (string) $notification->id,
                        'church_id' => $churchId === null ? null : (int) $churchId,
                    ],
                    'timestamp' => (int) round(microtime(true) * 1000),
                ], JSON_UNESCAPED_SLASHES)."\n",
                FILE_APPEND
            );

            // #endregion agent log
            return;
        }

        $tokens = PushToken::query()
            ->whereIn('user_id', $userIds)
            ->get(['platform', 'token']);

        if ($tokens->isEmpty()) {
            // #region agent log
            try {
                logger()->info('debug-5acbd2 Users exist but no tokens returned; skipping', [
                    'runId' => 'pre-fix',
                    'hypothesisId' => 'H3',
                    'notification_id' => (string) $notification->id,
                    'user_ids_count' => count($userIds),
                ]);
            } catch (\Throwable) {
            }
            @file_put_contents(
                base_path('.cursor/debug-5acbd2.log'),
                json_encode([
                    'sessionId' => '5acbd2',
                    'runId' => 'pre-fix',
                    'hypothesisId' => 'H3',
                    'location' => 'app/Http/Controllers/AppNotificationController.php:dispatchNativePushForNotification',
                    'message' => 'Users exist but no tokens returned; skipping',
                    'data' => [
                        'notification_id' => (string) $notification->id,
                        'user_ids_count' => count($userIds),
                    ],
                    'timestamp' => (int) round(microtime(true) * 1000),
                ], JSON_UNESCAPED_SLASHES)."\n",
                FILE_APPEND
            );

            // #endregion agent log
            return;
        }

        $fcm = new FcmMessaging;
        $title = (string) $notification->title;
        $body = (string) $notification->body;
        $payload = [
            'type' => 'app_notification',
            'id' => (string) $notification->id,
            'title' => $title,
            'body' => $body,
        ];

        // #region agent log
        try {
            logger()->info('debug-5acbd2 Dispatching native push via FCM', [
                'runId' => 'pre-fix',
                'hypothesisId' => 'H4',
                'notification_id' => (string) $notification->id,
                'church_id' => $churchId === null ? null : (int) $churchId,
                'user_ids_count' => count($userIds),
                'tokens_count' => $tokens->count(),
                'platform_counts' => $tokens->groupBy('platform')->map->count()->all(),
            ]);
        } catch (\Throwable) {
        }
        @file_put_contents(
            base_path('.cursor/debug-5acbd2.log'),
            json_encode([
                'sessionId' => '5acbd2',
                'runId' => 'pre-fix',
                'hypothesisId' => 'H4',
                'location' => 'app/Http/Controllers/AppNotificationController.php:dispatchNativePushForNotification',
                'message' => 'Dispatching native push via FCM',
                'data' => [
                    'notification_id' => (string) $notification->id,
                    'church_id' => $churchId === null ? null : (int) $churchId,
                    'user_ids_count' => count($userIds),
                    'tokens_count' => $tokens->count(),
                    'platform_counts' => $tokens->groupBy('platform')->map->count()->all(),
                ],
                'timestamp' => (int) round(microtime(true) * 1000),
            ], JSON_UNESCAPED_SLASHES)."\n",
            FILE_APPEND
        );
        // #endregion agent log

        foreach ($tokens as $row) {
            $token = (string) $row->token;
            if ($token === '') {
                continue;
            }

            $fcm->sendVisibleNotification($token, $title, $body, $payload);
        }
    }
}
