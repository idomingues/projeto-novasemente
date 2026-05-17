<?php

namespace App\Http\Controllers;

use App\Models\AppNotification;
use App\Models\Church;
use App\Services\NativePushNotifier;
use Illuminate\Http\Request;

class AppNotificationController extends Controller
{
    public function __construct(
        private readonly NativePushNotifier $nativePush,
    ) {}

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

        $this->nativePush->notifyChurchBroadcast(
            $churchId,
            (string) $notification->title,
            (string) $notification->body,
            [
                'type' => 'app_notification',
                'id' => (string) $notification->id,
                'title' => (string) $notification->title,
                'body' => (string) $notification->body,
            ],
        );

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
}
