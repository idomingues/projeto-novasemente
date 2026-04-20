<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AuthLoginEvent extends Model
{
    public const OUTCOME_SUCCESS = 'success';

    public const OUTCOME_FAILED = 'failed';

    public const OUTCOME_LOCKOUT = 'lockout';

    public const OUTCOME_IP_BLOCKED = 'ip_blocked';

    public const OUTCOME_HONEYPOT = 'honeypot';

    protected $fillable = [
        'outcome',
        'user_id',
        'identifier_hash',
        'ip_address',
        'user_agent',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public static function hashIdentifier(string $login): string
    {
        return hash('sha256', mb_strtolower(trim($login), 'UTF-8'));
    }

    public static function record(
        string $outcome,
        ?int $userId,
        ?string $loginForHash,
        ?string $ip,
        ?string $userAgent,
    ): void {
        self::query()->create([
            'outcome' => $outcome,
            'user_id' => $userId,
            'identifier_hash' => $loginForHash !== null && $loginForHash !== ''
                ? self::hashIdentifier($loginForHash)
                : null,
            'ip_address' => $ip,
            'user_agent' => $userAgent !== null && strlen($userAgent) > 2000
                ? substr($userAgent, 0, 2000)
                : $userAgent,
        ]);
    }
}
