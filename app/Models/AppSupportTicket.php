<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AppSupportTicket extends Model
{
    protected $table = 'app_support_tickets';

    protected $fillable = [
        'public_token',
        'user_id',
        'pastoral_appointment_id',
        'type',
        'message',
        'guest_name',
        'guest_email',
        'guest_phone',
        'status',
        'solution_text',
        'closed_at',
        'user_hidden_at',
    ];

    protected $casts = [
        'closed_at' => 'datetime',
        'user_hidden_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function pastoralAppointment(): BelongsTo
    {
        return $this->belongsTo(PastoralAppointment::class, 'pastoral_appointment_id');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(AppSupportMessage::class, 'ticket_id')->orderBy('created_at');
    }
}
