<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ChurchConversationMessage extends Model
{
    public const KIND_PUBLIC = 'public';

    public const KIND_INTERNAL = 'internal';

    public const KIND_SYSTEM = 'system';

    protected $fillable = [
        'conversation_id',
        'author_user_id',
        'author_role',
        'body',
        'kind',
        'edited_at',
        'member_hidden_at',
    ];

    protected function casts(): array
    {
        return [
            'edited_at' => 'datetime',
            'member_hidden_at' => 'datetime',
        ];
    }

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(ChurchConversation::class, 'conversation_id');
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_user_id');
    }

    public function versions(): HasMany
    {
        return $this->hasMany(ChurchConversationMessageVersion::class, 'message_id')->orderBy('created_at');
    }
}
