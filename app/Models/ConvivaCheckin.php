<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ConvivaCheckin extends Model
{
    use HasFactory;

    protected $fillable = [
        'church_id',
        'user_id',
        'conviva_class_id',
        'checkin_date',
    ];

    protected function casts(): array
    {
        return [
            'checkin_date' => 'date',
        ];
    }

    public function church(): BelongsTo
    {
        return $this->belongsTo(Church::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function convivaClass(): BelongsTo
    {
        return $this->belongsTo(ConvivaClass::class, 'conviva_class_id');
    }
}
