<?php

namespace App\Http\Controllers;

use App\Models\PushToken;
use Illuminate\Http\Request;

class PushTokenController extends Controller
{
    public function store(Request $request)
    {
        abort_unless($request->user() !== null, 401);

        $data = $request->validate([
            'platform' => ['required', 'string', 'in:ios,android'],
            'token' => ['required', 'string', 'max:512'],
            'device_id' => ['nullable', 'string', 'max:128'],
        ]);

        $token = PushToken::query()->updateOrCreate(
            [
                'platform' => $data['platform'],
                'token' => $data['token'],
            ],
            [
                'user_id' => $request->user()->id,
                'device_id' => $data['device_id'] ?? null,
                'last_seen_at' => now(),
            ]
        );

        return response()->json([
            'ok' => true,
            'id' => $token->id,
        ]);
    }

    public function destroy(Request $request)
    {
        abort_unless($request->user() !== null, 401);

        $data = $request->validate([
            'platform' => ['required', 'string', 'in:ios,android'],
            'token' => ['required', 'string', 'max:512'],
        ]);

        PushToken::query()
            ->where('user_id', $request->user()->id)
            ->where('platform', $data['platform'])
            ->where('token', $data['token'])
            ->delete();

        return response()->json(['ok' => true]);
    }
}
