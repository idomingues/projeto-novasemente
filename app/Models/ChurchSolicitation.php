<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ChurchSolicitation extends Model
{
    protected $fillable = [
        'church_id',
        'user_id',
        'type',
        'status',
        'subject',
        'message',
        'preferred_date',
        'assigned_pastor_id',
        'assigned_volunteer_id',
        'meta',
        'internal_notes',
        'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'meta' => 'array',
            'preferred_date' => 'date',
            'completed_at' => 'datetime',
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

    public function assignedPastor(): BelongsTo
    {
        return $this->belongsTo(Pastor::class, 'assigned_pastor_id');
    }

    public function assignedVolunteer(): BelongsTo
    {
        return $this->belongsTo(Volunteer::class, 'assigned_volunteer_id');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(ChurchSolicitationMessage::class)->orderBy('created_at');
    }

    public function allowsChat(): bool
    {
        return in_array($this->status, ['pending', 'in_progress'], true);
    }
}
