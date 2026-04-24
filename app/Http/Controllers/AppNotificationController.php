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
        $workingChurchId = request()->session()->get('working_church_id');
        if ($workingChurchId) {
            $church = Church::where('id', $workingChurchId)->where('active', true)->first();
            if ($church) {
                return (int) $church->id;
            }
        }
        return Church::where('active', true)->orderBy('name')->value('id');
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

        return redirect()->back()->with('success', 'Notificação enviada para todos os utilizadores do app.');
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
            return;
        }

        $tokens = PushToken::query()
            ->whereIn('user_id', $userIds)
            ->get(['platform', 'token']);

        if ($tokens->isEmpty()) {
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

        foreach ($tokens as $row) {
            $token = (string) $row->token;
            if ($token === '') {
                continue;
            }

            $fcm->sendVisibleNotification($token, $title, $body, $payload);
        }
    }
}
