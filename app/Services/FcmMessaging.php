<?php

namespace App\Services;

use App\Models\PushToken;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Throwable;

class FcmMessaging
{
    public static function enabled(): bool
    {
        $cfg = config('services.fcm', []);

        return is_array($cfg)
            && filled($cfg['project_id'] ?? null)
            && filled($cfg['client_email'] ?? null)
            && filled($cfg['private_key'] ?? null);
    }

    public function sendVisibleNotification(string $token, string $title, string $body, array $data = []): bool
    {
        $projectId = (string) config('services.fcm.project_id');
        $accessToken = $this->accessToken();
        if ($accessToken === null || $accessToken === '') {
            // #region agent log
            try {
                logger()->warning('debug-5acbd2 No OAuth access token; FCM send aborted', [
                    'runId' => 'pre-fix',
                    'hypothesisId' => 'H2',
                    'project_id_present' => $projectId !== '',
                    'token_sha1_8' => substr(sha1($token), 0, 8),
                ]);
            } catch (\Throwable) {
            }
            @file_put_contents(
                base_path('.cursor/debug-5acbd2.log'),
                json_encode([
                    'sessionId' => '5acbd2',
                    'runId' => 'pre-fix',
                    'hypothesisId' => 'H2',
                    'location' => 'app/Services/FcmMessaging.php:sendVisibleNotification',
                    'message' => 'No OAuth access token; FCM send aborted',
                    'data' => [
                        'project_id_present' => $projectId !== '',
                        'token_sha1_8' => substr(sha1($token), 0, 8),
                    ],
                    'timestamp' => (int) round(microtime(true) * 1000),
                ], JSON_UNESCAPED_SLASHES) . "\n",
                FILE_APPEND
            );
            // #endregion agent log
            return false;
        }

        $url = "https://fcm.googleapis.com/v1/projects/{$projectId}/messages:send";

        $dataStrings = collect($data)
            ->mapWithKeys(fn ($v, $k) => [(string) $k => is_string($v) ? $v : json_encode($v)])
            ->all();

        $payload = [
            'message' => [
                'token' => $token,
                'notification' => [
                    'title' => $title,
                    'body' => $body,
                ],
                'data' => $dataStrings,
                'android' => [
                    'priority' => 'HIGH',
                    'notification' => [
                        'channel_id' => 'default',
                    ],
                ],
                'apns' => [
                    'headers' => [
                        'apns-priority' => '10',
                    ],
                    'payload' => [
                        'aps' => [
                            'alert' => [
                                'title' => $title,
                                'body' => $body,
                            ],
                            'sound' => 'default',
                        ],
                    ],
                ],
            ],
        ];

        $res = Http::withToken($accessToken)
            ->acceptJson()
            ->asJson()
            ->post($url, $payload);

        if ($res->successful()) {
            // #region agent log
            try {
                logger()->info('debug-5acbd2 FCM send OK', [
                    'runId' => 'pre-fix',
                    'hypothesisId' => 'H4',
                    'token_sha1_8' => substr(sha1($token), 0, 8),
                    'status' => $res->status(),
                ]);
            } catch (\Throwable) {
            }
            @file_put_contents(
                base_path('.cursor/debug-5acbd2.log'),
                json_encode([
                    'sessionId' => '5acbd2',
                    'runId' => 'pre-fix',
                    'hypothesisId' => 'H4',
                    'location' => 'app/Services/FcmMessaging.php:sendVisibleNotification',
                    'message' => 'FCM send OK',
                    'data' => [
                        'token_sha1_8' => substr(sha1($token), 0, 8),
                        'status' => $res->status(),
                    ],
                    'timestamp' => (int) round(microtime(true) * 1000),
                ], JSON_UNESCAPED_SLASHES) . "\n",
                FILE_APPEND
            );
            // #endregion agent log
            return true;
        }

        // #region agent log
        $json = $res->json();
        try {
            logger()->warning('debug-5acbd2 FCM send failed', [
                'runId' => 'pre-fix',
                'hypothesisId' => 'H5',
                'token_sha1_8' => substr(sha1($token), 0, 8),
                'status' => $res->status(),
                'error_status' => is_array($json) ? ($json['error']['status'] ?? null) : null,
                'error_message' => is_array($json) ? ($json['error']['message'] ?? null) : null,
                'error_code' => is_array($json) && isset($json['error']['details']) && is_array($json['error']['details'])
                    ? collect($json['error']['details'])->first(fn ($d) => is_array($d) && isset($d['errorCode']))['errorCode'] ?? null
                    : null,
            ]);
        } catch (\Throwable) {
        }
        @file_put_contents(
            base_path('.cursor/debug-5acbd2.log'),
            json_encode([
                'sessionId' => '5acbd2',
                'runId' => 'pre-fix',
                'hypothesisId' => 'H5',
                'location' => 'app/Services/FcmMessaging.php:sendVisibleNotification',
                'message' => 'FCM send failed',
                'data' => [
                    'token_sha1_8' => substr(sha1($token), 0, 8),
                    'status' => $res->status(),
                    'error_status' => is_array($json) ? ($json['error']['status'] ?? null) : null,
                    'error_message' => is_array($json) ? ($json['error']['message'] ?? null) : null,
                    'error_code' => is_array($json) && isset($json['error']['details']) && is_array($json['error']['details'])
                        ? collect($json['error']['details'])->first(fn ($d) => is_array($d) && isset($d['errorCode']))['errorCode'] ?? null
                        : null,
                ],
                'timestamp' => (int) round(microtime(true) * 1000),
            ], JSON_UNESCAPED_SLASHES) . "\n",
            FILE_APPEND
        );
        // #endregion agent log

        $this->maybePruneInvalidToken($token, $res->json());

        return false;
    }

    private function maybePruneInvalidToken(string $token, mixed $json): void
    {
        $details = is_array($json) ? ($json['error'] ?? null) : null;
        if (! is_array($details)) {
            return;
        }

        $status = $details['status'] ?? null;
        $code = null;
        $errs = $details['details'] ?? null;
        if (is_array($errs)) {
            foreach ($errs as $e) {
                if (is_array($e) && isset($e['errorCode']) && is_string($e['errorCode'])) {
                    $code = $e['errorCode'];
                    break;
                }
            }
        }

        $shouldDelete = $status === 'NOT_FOUND'
            || in_array($code, ['UNREGISTERED', 'SENDER_ID_MISMATCH', 'INVALID_ARGUMENT'], true);

        if (! $shouldDelete) {
            return;
        }

        PushToken::query()->where('token', $token)->delete();
    }

    private function accessToken(): ?string
    {
        if (! self::enabled()) {
            return null;
        }

        return Cache::remember('fcm:oauth:access_token', now()->addMinutes(50), function (): ?string {
            try {
                $jwt = $this->signedJwt();

                $res = Http::asForm()
                    ->acceptJson()
                    ->post('https://oauth2.googleapis.com/token', [
                        'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                        'assertion' => $jwt,
                    ]);

                if (! $res->successful()) {
                    return null;
                }

                $token = $res->json('access_token');

                return is_string($token) && $token !== '' ? $token : null;
            } catch (Throwable) {
                return null;
            }
        });
    }

    private function signedJwt(): string
    {
        $clientEmail = (string) config('services.fcm.client_email');
        $privateKeyPem = $this->normalizedPrivateKey((string) config('services.fcm.private_key'));

        $now = time();
        $header = ['alg' => 'RS256', 'typ' => 'JWT'];
        $claims = [
            'iss' => $clientEmail,
            'sub' => $clientEmail,
            'aud' => 'https://oauth2.googleapis.com/token',
            'iat' => $now,
            'exp' => $now + 3600,
            'scope' => 'https://www.googleapis.com/auth/firebase.messaging',
        ];

        $segments = [
            $this->base64UrlEncode(json_encode($header, JSON_THROW_ON_ERROR)),
            $this->base64UrlEncode(json_encode($claims, JSON_THROW_ON_ERROR)),
        ];
        $signingInput = implode('.', $segments);

        $pkey = openssl_pkey_get_private($privateKeyPem);
        if ($pkey === false) {
            throw new \RuntimeException('Invalid FCM private key.');
        }

        $signature = '';
        openssl_sign($signingInput, $signature, $pkey, OPENSSL_ALGO_SHA256);

        $segments[] = $this->base64UrlEncode($signature);

        return implode('.', $segments);
    }

    private function normalizedPrivateKey(string $raw): string
    {
        $key = str_replace('\\n', "\n", $raw);
        $key = trim($key);

        return $key;
    }

    private function base64UrlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }
}
