<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ScheduleAssignment extends Model
{
    protected $fillable = [
        'ministry_id',
        'member_id',
        'schedule_role_id',
        'saturday_number',
        'schedule_date',
        'recurring',
        'assignment_month',
        'assignment_year',
        'status',
        'start_time',
        'end_time',
        'checked_in_at',
    ];

    protected $casts = [
        'schedule_date' => 'date',
        'recurring' => 'boolean',
        'checked_in_at' => 'datetime',
    ];

    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class);
    }

    public function scheduleRole(): BelongsTo
    {
        return $this->belongsTo(ScheduleRole::class);
    }

    public function ministry(): BelongsTo
    {
        return $this->belongsTo(Ministry::class);
    }
}
