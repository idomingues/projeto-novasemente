<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ConvivaPreference extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'church_id',
        'conviva_class_id',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function church(): BelongsTo
    {
        return $this->belongsTo(Church::class);
    }

    public function convivaClass(): BelongsTo
    {
        return $this->belongsTo(ConvivaClass::class, 'conviva_class_id');
    }
}
