<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ScheduleCoordinatorSkip extends Model
{
    protected $fillable = [
        'schedule_coordinator_id',
        'occurrence_date',
    ];

    protected $casts = [
        'occurrence_date' => 'date',
    ];

    public function scheduleCoordinator(): BelongsTo
    {
        return $this->belongsTo(ScheduleCoordinator::class);
    }
}
