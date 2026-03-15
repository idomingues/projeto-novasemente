<?php

namespace App\Http\Controllers;

use App\Models\AppNotification;
use App\Models\Church;
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

        AppNotification::create([
            'church_id' => $churchId,
            'title' => $data['title'],
            'body' => $data['body'],
            'created_by' => $request->user()?->id,
        ]);

        return redirect()->back()->with('success', 'Notificação enviada para todos os utilizadores do app.');
    }
}
