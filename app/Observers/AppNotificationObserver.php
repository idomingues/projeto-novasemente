<?php

namespace App\Observers;

use App\Models\AppNotification;
use App\Services\NativePushNotifier;

class AppNotificationObserver
{
    public function __construct(
        private readonly NativePushNotifier $nativePush,
    ) {}

    public function created(AppNotification $notification): void
    {
        $href = is_string($notification->action_url) ? trim($notification->action_url) : '';

        $this->nativePush->notifyChurchBroadcast(
            $notification->church_id !== null ? (int) $notification->church_id : null,
            (string) $notification->title,
            (string) $notification->body,
            array_filter([
                'type' => 'app_notification',
                'id' => (string) $notification->id,
                'title' => (string) $notification->title,
                'body' => (string) $notification->body,
                'href' => $href !== '' ? $href : null,
            ]),
        );
    }
}
