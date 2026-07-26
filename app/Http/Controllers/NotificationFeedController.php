<?php

namespace App\Http\Controllers;

use App\Support\NotificationFeed;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationFeedController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        abort_unless($request->user(), 401);

        return response()->json([
            'recentNotifications' => NotificationFeed::unreadInboxGroupedForUser($request, 24),
            'unreadInboxNotificationsCount' => NotificationFeed::unreadInboxCount($request),
        ]);
    }
}
