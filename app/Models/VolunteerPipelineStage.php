<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class VolunteerPipelineStage extends Model
{
    protected $fillable = [
        'church_id',
        'name',
        'sort_order',
    ];

    public function church(): BelongsTo
    {
        return $this->belongsTo(Church::class);
    }

    public function churchPipelines(): HasMany
    {
        return $this->hasMany(VolunteerChurchPipeline::class, 'stage_id');
    }
}
