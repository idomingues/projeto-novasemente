<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VolunteerMinistryInvitationSlot extends Model
{
    protected $fillable = [
        'invitation_id',
        'day_of_week',
        'start_time',
        'end_time',
    ];

    public function invitation(): BelongsTo
    {
        return $this->belongsTo(VolunteerMinistryInvitation::class, 'invitation_id');
    }
}

