<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ChurchSolicitationMessage extends Model
{
    protected $fillable = [
        'church_solicitation_id',
        'sender_type',
        'sender_user_id',
        'content',
    ];

    public function solicitation(): BelongsTo
    {
        return $this->belongsTo(ChurchSolicitation::class, 'church_solicitation_id');
    }

    public function senderUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_user_id');
    }
}

