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
        'admin_workflow_stage_id',
        'staff_archived_at',
    ];

    protected function casts(): array
    {
        return [
            'staff_archived_at' => 'datetime',
        ];
    }

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

    public function adminWorkflowStage(): BelongsTo
    {
        return $this->belongsTo(VolunteerPipelineStage::class, 'admin_workflow_stage_id');
    }
}
