<?php

namespace App\Http\Controllers;

use App\Models\Church;
use App\Support\NotificationFeed;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationFeedController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        abort_unless($request->user(), 401);

        $churchId = Church::resolveWorkingId($request);

        return response()->json([
            'recentNotifications' => NotificationFeed::mergedForUser($request, $churchId, 5),
            'unreadInboxNotificationsCount' => NotificationFeed::unreadInboxCount($request),
        ]);
    }
}
