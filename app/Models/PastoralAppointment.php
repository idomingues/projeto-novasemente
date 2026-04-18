<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PastoralAppointment extends Model
{
    protected $fillable = [
        'church_id',
        'requester_user_id',
        'requester_name',
        'preferred_pastor_id',
        'created_by_user_id',
        'source',
        'status',
        'subject',
        'notes',
        'preferred_start',
        'preferred_modality',
        'starts_at',
        'ends_at',
        'support_ticket_id',
    ];

    protected function casts(): array
    {
        return [
            'preferred_start' => 'datetime',
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
        ];
    }

    public function church(): BelongsTo
    {
        return $this->belongsTo(Church::class);
    }

    public function requesterUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requester_user_id');
    }

    public function preferredPastor(): BelongsTo
    {
        return $this->belongsTo(Pastor::class, 'preferred_pastor_id');
    }

    public function createdByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function supportTicket(): BelongsTo
    {
        return $this->belongsTo(AppSupportTicket::class, 'support_ticket_id');
    }
}
