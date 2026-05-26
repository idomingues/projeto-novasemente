<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MissionVolunteerPhaseHistory extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'church_id',
        'mission_volunteer_id',
        'changed_by_user_id',
        'from_phase_id',
        'to_phase_id',
        'from_phase_name',
        'to_phase_name',
        'created_at',
    ];

    protected $casts = [
        'created_at' => 'datetime',
    ];

    public function volunteer(): BelongsTo
    {
        return $this->belongsTo(MissionVolunteer::class, 'mission_volunteer_id');
    }

    public function changedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'changed_by_user_id');
    }
}
