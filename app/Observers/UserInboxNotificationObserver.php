<?php

namespace App\Observers;

use App\Models\UserInboxNotification;
use App\Services\NativePushNotifier;

class UserInboxNotificationObserver
{
    public function __construct(
        private readonly NativePushNotifier $nativePush,
    ) {}

    public function saved(UserInboxNotification $notification): void
    {
        if ($notification->wasRecentlyCreated && blank($notification->action_url)) {
            return;
        }

        if (! $notification->wasRecentlyCreated && ! $notification->wasChanged('action_url')) {
            return;
        }

        $href = is_string($notification->action_url) ? $notification->action_url : '';

        $this->nativePush->notifyUser(
            (int) $notification->user_id,
            (string) $notification->title,
            (string) $notification->body,
            [
                'type' => 'inbox_notification',
                'id' => (string) $notification->id,
                'title' => (string) $notification->title,
                'body' => (string) $notification->body,
                'href' => $href,
                'intent' => UserInboxNotification::normalizeIntent(
                    is_string($notification->intent) ? $notification->intent : null,
                ),
            ],
        );
    }
}
