<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class MissionInvitation extends Model
{
    protected $fillable = [
        'church_id',
        'mission_volunteer_id',
        'invited_by_user_id',
        'token',
        'status',
        'channel',
        'sent_at',
    ];

    protected $casts = [
        'sent_at' => 'datetime',
    ];

    public static function createToken(): string
    {
        return Str::random(48);
    }

    public function church(): BelongsTo
    {
        return $this->belongsTo(Church::class);
    }

    public function volunteer(): BelongsTo
    {
        return $this->belongsTo(MissionVolunteer::class, 'mission_volunteer_id');
    }

    public function invitedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'invited_by_user_id');
    }
}
