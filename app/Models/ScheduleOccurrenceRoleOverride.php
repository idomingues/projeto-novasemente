<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ScheduleOccurrenceRoleOverride extends Model
{
    protected $fillable = [
        'schedule_assignment_id',
        'occurrence_date',
        'schedule_role_id',
    ];

    protected $casts = [
        'occurrence_date' => 'date',
    ];

    public function scheduleAssignment(): BelongsTo
    {
        return $this->belongsTo(ScheduleAssignment::class);
    }

    public function scheduleRole(): BelongsTo
    {
        return $this->belongsTo(ScheduleRole::class);
    }
}
