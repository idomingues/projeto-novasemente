<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserFaceIdentity extends Model
{
    protected $fillable = [
        'user_id',
        'church_id',
        'reference_photo_path',
        'embedding',
        'embedding_dim',
        'model_version',
        'liveness_passed_at',
    ];

    protected function casts(): array
    {
        return [
            'embedding' => 'array',
            'embedding_dim' => 'integer',
            'liveness_passed_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function church(): BelongsTo
    {
        return $this->belongsTo(Church::class);
    }
}
