<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Room extends Model
{
    use HasFactory;

    public const FLOORS = [
        'terreo' => 'Térreo',
        'mezanino' => 'Mezanino',
        'primeiro' => 'Primeiro',
        'segundo' => 'Segundo',
        'terceiro' => 'Terceiro',
    ];

    protected $fillable = [
        'church_id',
        'name',
        'floor',
        'location',
        'capacity',
    ];

    public function church(): BelongsTo
    {
        return $this->belongsTo(Church::class);
    }
}

