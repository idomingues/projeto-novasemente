<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ConvivaClass extends Model
{
    use HasFactory;

    protected $fillable = [
        'church_id',
        'room_name',
        'teacher_name',
        'is_active',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    public function church(): BelongsTo
    {
        return $this->belongsTo(Church::class);
    }

    public function checkins(): HasMany
    {
        return $this->hasMany(ConvivaCheckin::class);
    }

    public function label(): string
    {
        return trim($this->room_name.' · '.$this->teacher_name);
    }
}
