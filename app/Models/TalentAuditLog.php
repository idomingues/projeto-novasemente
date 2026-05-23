<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TalentAuditLog extends Model
{
    protected $fillable = [
        'church_id',
        'user_id',
        'action',
        'subject_type',
        'subject_id',
        'meta',
    ];

    protected $casts = [
        'meta' => 'array',
    ];

    public function church(): BelongsTo
    {
        return $this->belongsTo(Church::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
