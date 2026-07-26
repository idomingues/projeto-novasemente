<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ChurchConversationForward extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'conversation_id',
        'from_ministry_id',
        'to_ministry_id',
        'to_leader_user_id',
        'reason',
        'internal_note',
        'forwarded_by_user_id',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
        ];
    }

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(ChurchConversation::class, 'conversation_id');
    }

    public function fromMinistry(): BelongsTo
    {
        return $this->belongsTo(Ministry::class, 'from_ministry_id');
    }

    public function toMinistry(): BelongsTo
    {
        return $this->belongsTo(Ministry::class, 'to_ministry_id');
    }

    public function toLeader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'to_leader_user_id');
    }

    public function forwardedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'forwarded_by_user_id');
    }
}
