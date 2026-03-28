<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Pastor extends Model
{
    protected $fillable = [
        'church_id',
        'name',
        'bio',
        'photo_path',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'sort_order' => 'integer',
        ];
    }

    public function church(): BelongsTo
    {
        return $this->belongsTo(Church::class);
    }
}
