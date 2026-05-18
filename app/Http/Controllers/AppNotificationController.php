<?php

namespace App\Http\Controllers;

use App\Models\AppNotification;
use App\Models\Church;
use App\Models\User;
use App\Models\UserInboxNotification;
use App\Services\NativePushNotifier;
use App\Support\UserMessagingPreferences;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

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

        $churchId = $this->currentChurchId();

        $data = $request->validate([
            'audience' => ['required', 'string', Rule::in(['all', 'user'])],
            'user_id' => [
                'nullable',
                'integer',
                Rule::requiredIf(fn () => $request->input('audience') === 'user'),
                Rule::exists('users', 'id'),
            ],
            'title' => ['required', 'string', 'max:255'],
            'body' => ['required', 'string', 'max:5000'],
        ]);

        if ($data['audience'] === 'user') {
            return $this->storeForUser($request, $churchId, $data);
        }

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

    /**
     * @param  array{audience: string, user_id?: int|null, title: string, body: string}  $data
     */
    private function storeForUser(Request $request, ?int $churchId, array $data)
    {
        $recipient = User::query()->findOrFail((int) $data['user_id']);

        if ($churchId !== null && (int) $recipient->church_id !== $churchId) {
            return redirect()->back()->withErrors([
                'user_id' => 'Selecione um usuário da igreja atual.',
            ]);
        }

        if (! UserMessagingPreferences::acceptsInbox($recipient)) {
            return redirect()->back()->withErrors([
                'user_id' => 'Este usuário desativou notificações na app.',
            ]);
        }

        $row = UserInboxNotification::create([
            'user_id' => $recipient->id,
            'title' => $data['title'],
            'body' => $data['body'],
            'action_url' => null,
        ]);

        $row->update([
            'action_url' => route('mobile.notifications', ['inbox' => $row->id], absolute: true),
        ]);

        return redirect()->back()->with(
            'success',
            'Notificação enviada para '.$recipient->name.'.',
        );
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
