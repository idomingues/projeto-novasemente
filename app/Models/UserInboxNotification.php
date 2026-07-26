<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserInboxNotification extends Model
{
    /** Precisa de atendimento / resposta (fila, chat, moderação, convite). */
    public const INTENT_ACTION = 'action';

    /** Aviso informativo (status, agradecimento, check-in, doação registrada, etc.). */
    public const INTENT_INFO = 'info';

    protected $fillable = [
        'user_id',
        'title',
        'body',
        'intent',
        'action_url',
        'read_at',
    ];

    protected function casts(): array
    {
        return [
            'read_at' => 'datetime',
        ];
    }

    public static function normalizeIntent(?string $intent): string
    {
        return $intent === self::INTENT_ACTION ? self::INTENT_ACTION : self::INTENT_INFO;
    }

    protected static function booted(): void
    {
        static::creating(function (self $notification): void {
            $notification->intent = self::normalizeIntent(
                is_string($notification->intent) ? $notification->intent : null,
            );
        });
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return \Illuminate\Database\Eloquent\Collection<int, self>
     */
    public static function forUser(User $user, int $limit = 50)
    {
        return static::query()
            ->where('user_id', $user->id)
            ->orderByDesc('created_at')
            ->limit($limit)
            ->get();
    }
}
