<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ScheduleCoordinator extends Model
{
    protected $fillable = [
        'ministry_id',
        'volunteer_id',
        'user_id',
        'saturday_number',
        'schedule_date',
        'recurring',
        'assignment_month',
        'assignment_year',
    ];

    protected $casts = [
        'schedule_date' => 'date',
        'recurring' => 'boolean',
    ];

    public function ministry(): BelongsTo
    {
        return $this->belongsTo(Ministry::class);
    }

    public function volunteer(): BelongsTo
    {
        return $this->belongsTo(Volunteer::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function occurrenceSkips(): HasMany
    {
        return $this->hasMany(ScheduleCoordinatorSkip::class);
    }

    public function isRecurringSeries(): bool
    {
        return $this->recurring && $this->saturday_number !== null && $this->schedule_date === null;
    }
}
