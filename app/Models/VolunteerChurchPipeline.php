<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VolunteerChurchPipeline extends Model
{
    protected $fillable = [
        'volunteer_id',
        'church_id',
        'stage_id',
    ];

    public function volunteer(): BelongsTo
    {
        return $this->belongsTo(Volunteer::class);
    }

    public function church(): BelongsTo
    {
        return $this->belongsTo(Church::class);
    }

    public function stage(): BelongsTo
    {
        return $this->belongsTo(VolunteerPipelineStage::class, 'stage_id');
    }
}
