<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VolunteerMinistryInvitationStatusHistory extends Model
{
    protected $table = 'volunteer_ministry_invitation_status_histories';

    protected $fillable = [
        'invitation_id',
        'church_id',
        'ministry_id',
        'volunteer_id',
        'changed_by_user_id',
        'from_status',
        'to_status',
        'note',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function invitation(): BelongsTo
    {
        return $this->belongsTo(VolunteerMinistryInvitation::class, 'invitation_id');
    }

    public function changedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'changed_by_user_id');
    }
}

