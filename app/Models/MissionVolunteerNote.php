<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MissionVolunteerNote extends Model
{
    protected $fillable = [
        'church_id',
        'mission_volunteer_id',
        'user_id',
        'body',
    ];

    public function volunteer(): BelongsTo
    {
        return $this->belongsTo(MissionVolunteer::class, 'mission_volunteer_id');
    }

    public function church(): BelongsTo
    {
        return $this->belongsTo(Church::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
