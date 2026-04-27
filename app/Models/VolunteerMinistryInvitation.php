<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class VolunteerMinistryInvitation extends Model
{
    protected $fillable = [
        'church_id',
        'volunteer_id',
        'ministry_id',
        'invited_by_user_id',
        'token',
        'status',
        'channel',
        'sent_at',
        'accepted_at',
        'declined_at',
        'decline_reason',
        'expires_at',
    ];

    protected $casts = [
        'sent_at' => 'datetime',
        'accepted_at' => 'datetime',
        'declined_at' => 'datetime',
        'expires_at' => 'datetime',
    ];

    public function church(): BelongsTo
    {
        return $this->belongsTo(Church::class);
    }

    public function volunteer(): BelongsTo
    {
        return $this->belongsTo(Volunteer::class);
    }

    public function ministry(): BelongsTo
    {
        return $this->belongsTo(Ministry::class);
    }

    public function invitedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'invited_by_user_id');
    }

    public function slots(): HasMany
    {
        return $this->hasMany(VolunteerMinistryInvitationSlot::class, 'invitation_id');
    }

    public function isExpired(): bool
    {
        return $this->expires_at !== null && $this->expires_at->isPast();
    }

    public function isPending(): bool
    {
        return $this->status === 'pending' && ! $this->isExpired();
    }

    public static function createToken(): string
    {
        return Str::random(48);
    }
}

