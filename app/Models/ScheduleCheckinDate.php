<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ScheduleCheckinDate extends Model
{
    public $timestamps = false;

    protected $fillable = ['schedule_date', 'enabled_by'];

    protected $casts = [
        'schedule_date' => 'date',
        'enabled_at' => 'datetime',
    ];

    public function enabledByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'enabled_by');
    }
}
