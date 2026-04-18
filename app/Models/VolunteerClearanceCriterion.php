<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class VolunteerClearanceCriterion extends Model
{
    protected $fillable = [
        'ministry_id',
        'label',
        'sort_order',
        'active',
    ];

    protected function casts(): array
    {
        return [
            'active' => 'boolean',
        ];
    }

    public function ministry(): BelongsTo
    {
        return $this->belongsTo(Ministry::class);
    }

    public function checks(): HasMany
    {
        return $this->hasMany(VolunteerClearanceCheck::class, 'criterion_id');
    }
}
