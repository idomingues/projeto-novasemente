<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AppSupportTicket extends Model
{
    public const STATUS_OPEN = 'open';

    public const STATUS_IN_PROGRESS = 'in_progress';

    public const STATUS_WAITING_USER = 'waiting_user';

    public const STATUS_RESOLVED = 'resolved';

    public const STATUS_CLOSED = 'closed';

    protected $table = 'app_support_tickets';

    protected $fillable = [
        'public_token',
        'user_id',
        'pastoral_appointment_id',
        'type',
        'message',
        'guest_name',
        'guest_email',
        'guest_phone',
        'status',
        'screenshot_path',
        'screenshot_url',
        'solution_text',
        'closed_at',
        'user_hidden_at',
    ];

    protected $casts = [
        'closed_at' => 'datetime',
        'user_hidden_at' => 'datetime',
    ];

    /**
     * @return list<string>
     */
    public static function statuses(): array
    {
        return [
            self::STATUS_OPEN,
            self::STATUS_IN_PROGRESS,
            self::STATUS_WAITING_USER,
            self::STATUS_RESOLVED,
            self::STATUS_CLOSED,
        ];
    }

    /**
     * @return list<string>
     */
    public static function activeStatuses(): array
    {
        return [
            self::STATUS_OPEN,
            self::STATUS_IN_PROGRESS,
            self::STATUS_WAITING_USER,
        ];
    }

    public static function isActiveStatus(string $status): bool
    {
        return in_array($status, self::activeStatuses(), true);
    }

    /**
     * @return list<string>
     */
    public static function finalStatuses(): array
    {
        return [
            self::STATUS_RESOLVED,
            self::STATUS_CLOSED,
        ];
    }

    public static function isFinalStatus(string $status): bool
    {
        return in_array($status, self::finalStatuses(), true);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function pastoralAppointment(): BelongsTo
    {
        return $this->belongsTo(PastoralAppointment::class, 'pastoral_appointment_id');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(AppSupportMessage::class, 'ticket_id')->orderBy('created_at');
    }
}
