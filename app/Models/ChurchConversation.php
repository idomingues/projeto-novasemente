<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ChurchConversation extends Model
{
    public const STATUS_NEW = 'new';

    public const STATUS_IN_SERVICE = 'in_service';

    public const STATUS_AWAITING_MEMBER = 'awaiting_member';

    public const STATUS_AWAITING_DEPARTMENT = 'awaiting_department';

    public const STATUS_FORWARDED = 'forwarded';

    public const STATUS_CLOSED = 'closed';

    protected $fillable = [
        'church_id',
        'member_user_id',
        'subject',
        'initial_ministry_id',
        'current_ministry_id',
        'preferred_leader_user_id',
        'assignee_user_id',
        'status',
        'last_activity_at',
        'staff_alerted_at',
        'member_alerted_at',
        'closed_at',
        'closed_by_user_id',
        'closed_by_role',
        'reopen_until',
        'member_archived_at',
        'involves_minor',
        'legacy_solicitation_id',
    ];

    protected function casts(): array
    {
        return [
            'last_activity_at' => 'datetime',
            'staff_alerted_at' => 'datetime',
            'member_alerted_at' => 'datetime',
            'closed_at' => 'datetime',
            'reopen_until' => 'datetime',
            'member_archived_at' => 'datetime',
            'involves_minor' => 'boolean',
        ];
    }

    public function church(): BelongsTo
    {
        return $this->belongsTo(Church::class);
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(User::class, 'member_user_id');
    }

    public function initialMinistry(): BelongsTo
    {
        return $this->belongsTo(Ministry::class, 'initial_ministry_id');
    }

    public function currentMinistry(): BelongsTo
    {
        return $this->belongsTo(Ministry::class, 'current_ministry_id');
    }

    public function preferredLeader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'preferred_leader_user_id');
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assignee_user_id');
    }

    public function closedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'closed_by_user_id');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(ChurchConversationMessage::class, 'conversation_id')->orderBy('created_at');
    }

    public function events(): HasMany
    {
        return $this->hasMany(ChurchConversationEvent::class, 'conversation_id')->orderBy('created_at');
    }

    public function reads(): HasMany
    {
        return $this->hasMany(ChurchConversationRead::class, 'conversation_id');
    }

    public function transfers(): HasMany
    {
        return $this->hasMany(ChurchConversationTransfer::class, 'conversation_id')->orderBy('created_at');
    }

    public function forwards(): HasMany
    {
        return $this->hasMany(ChurchConversationForward::class, 'conversation_id')->orderBy('created_at');
    }

    public function archives(): HasMany
    {
        return $this->hasMany(ChurchConversationArchive::class, 'conversation_id');
    }

    public function allowsChat(): bool
    {
        return true;
    }

    public static function memberStatusLabel(string $status): string
    {
        return match ($status) {
            self::STATUS_AWAITING_MEMBER => 'Aguardando você',
            default => 'Em andamento',
        };
    }

    public static function staffStatusLabel(string $status): string
    {
        return match ($status) {
            self::STATUS_NEW => 'Nova',
            self::STATUS_IN_SERVICE => 'Em atendimento',
            self::STATUS_AWAITING_MEMBER => 'Aguardando membro',
            self::STATUS_AWAITING_DEPARTMENT => 'Aguardando departamento',
            self::STATUS_FORWARDED => 'Encaminhada',
            default => 'Em andamento',
        };
    }
}
