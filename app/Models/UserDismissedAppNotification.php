<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserDismissedAppNotification extends Model
{
    protected $fillable = [
        'user_id',
        'app_notification_id',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function appNotification(): BelongsTo
    {
        return $this->belongsTo(AppNotification::class);
    }
}
