<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AppSupportMessage extends Model
{
    protected $table = 'app_support_messages';

    protected $fillable = [
        'ticket_id',
        'sender_type',
        'sender_user_id',
        'content',
    ];

    public function ticket(): BelongsTo
    {
        return $this->belongsTo(AppSupportTicket::class, 'ticket_id');
    }

    public function senderUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_user_id');
    }
}
