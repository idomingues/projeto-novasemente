<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ScheduleOccurrenceSkip extends Model
{
    protected $fillable = [
        'schedule_assignment_id',
        'occurrence_date',
    ];

    protected $casts = [
        'occurrence_date' => 'date',
    ];

    public function scheduleAssignment(): BelongsTo
    {
        return $this->belongsTo(ScheduleAssignment::class);
    }
}
