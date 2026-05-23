<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SharedTalentEnrollmentMessage extends Model
{
    protected $fillable = [
        'enrollment_id',
        'user_id',
        'body',
    ];

    public function enrollment(): BelongsTo
    {
        return $this->belongsTo(SharedTalentEnrollment::class, 'enrollment_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
