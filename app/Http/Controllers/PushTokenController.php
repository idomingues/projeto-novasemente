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
        // #region agent log
        try {
            logger()->info('debug-5acbd2 push-token store called', [
                'runId' => 'pre-fix',
                'hypothesisId' => 'H1',
                'user_id' => $request->user()->id,
                'platform' => (string) ($data['platform'] ?? ''),
                'device_id_present' => array_key_exists('device_id', $data) && is_string($data['device_id']) && $data['device_id'] !== '',
                'token_len' => is_string($data['token'] ?? null) ? strlen($data['token']) : null,
                'token_sha1_8' => is_string($data['token'] ?? null) ? substr(sha1($data['token']), 0, 8) : null,
            ]);
        } catch (\Throwable) {
        }
        @file_put_contents(
            base_path('.cursor/debug-5acbd2.log'),
            json_encode([
                'sessionId' => '5acbd2',
                'runId' => 'pre-fix',
                'hypothesisId' => 'H1',
                'location' => 'app/Http/Controllers/PushTokenController.php:store',
                'message' => 'push-token store called',
                'data' => [
                    'user_id' => $request->user()->id,
                    'platform' => (string) ($data['platform'] ?? ''),
                    'device_id_present' => array_key_exists('device_id', $data) && is_string($data['device_id']) && $data['device_id'] !== '',
                    'token_len' => is_string($data['token'] ?? null) ? strlen($data['token']) : null,
                    'token_sha1_8' => is_string($data['token'] ?? null) ? substr(sha1($data['token']), 0, 8) : null,
                ],
                'timestamp' => (int) round(microtime(true) * 1000),
            ], JSON_UNESCAPED_SLASHES) . "\n",
            FILE_APPEND
        );
        // #endregion agent log

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

