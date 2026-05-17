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

    /** Testa credenciais (OAuth). Útil para `notifications:check-fcm`. */
    public function canAuthenticate(): bool
    {
        if (! self::enabled()) {
            return false;
        }

        Cache::forget('fcm:oauth:access_token');

        $token = $this->accessToken();

        return is_string($token) && $token !== '';
    }

    public function sendVisibleNotification(string $token, string $title, string $body, array $data = []): bool
    {
        $projectId = (string) config('services.fcm.project_id');
        $accessToken = $this->accessToken();
        if ($accessToken === null || $accessToken === '') {
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
            return true;
        }

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
