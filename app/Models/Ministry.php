<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Ministry extends Model
{
    use HasFactory;

    protected $fillable = [
        'church_id',
        'name',
        'icon',
        'description',
    ];

    public function church(): BelongsTo
    {
        return $this->belongsTo(Church::class);
    }
}

