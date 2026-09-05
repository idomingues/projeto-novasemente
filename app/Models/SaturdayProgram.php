<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SaturdayProgram extends Model
{
    protected $fillable = [
        'church_id',
        'saturday_date',
        'title',
        'pdf_path',
        'published_at',
        'is_active',
    ];

    protected $casts = [
        'saturday_date' => 'date',
        'published_at' => 'datetime',
        'is_active' => 'boolean',
    ];

    public function church(): BelongsTo
    {
        return $this->belongsTo(Church::class);
    }
}
