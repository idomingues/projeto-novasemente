<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserDismissedAppNovelty extends Model
{
    protected $fillable = [
        'user_id',
        'app_novelty_id',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function appNovelty(): BelongsTo
    {
        return $this->belongsTo(AppNovelty::class);
    }
}
