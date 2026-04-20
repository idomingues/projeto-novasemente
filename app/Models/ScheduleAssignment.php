<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ScheduleAssignment extends Model
{
    protected $fillable = [
        'ministry_id',
        'user_id',
        'volunteer_id',
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

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function volunteer(): BelongsTo
    {
        return $this->belongsTo(Volunteer::class);
    }

    public function scheduleRole(): BelongsTo
    {
        return $this->belongsTo(ScheduleRole::class);
    }

    public function ministry(): BelongsTo
    {
        return $this->belongsTo(Ministry::class);
    }

    public function occurrenceSkips(): HasMany
    {
        return $this->hasMany(ScheduleOccurrenceSkip::class);
    }

    public function occurrenceRoleOverrides(): HasMany
    {
        return $this->hasMany(ScheduleOccurrenceRoleOverride::class);
    }
}
