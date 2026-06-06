<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MissionPhase extends Model
{
    protected $fillable = [
        'church_id',
        'name',
        'sort_order',
        'sla_days',
    ];

    protected $casts = [
        'sort_order' => 'integer',
        'sla_days' => 'integer',
    ];

    public function church(): BelongsTo
    {
        return $this->belongsTo(Church::class);
    }

    public function volunteers(): HasMany
    {
        return $this->hasMany(MissionVolunteer::class, 'mission_phase_id');
    }

    public function leaders(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'mission_user_phases')
            ->withTimestamps();
    }
}
