<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class VolunteerMinistryInvitation extends Model
{
    protected $fillable = [
        'church_id',
        'volunteer_id',
        'ministry_id',
        'invited_by_user_id',
        'token',
        'status',
        'channel',
        'sent_at',
        'accepted_at',
        'declined_at',
        'decline_reason',
        'expires_at',
        'intro_message',
        'leader_status',
        'leader_note',
        'leader_status_set_by_user_id',
        'leader_status_set_at',
    ];

    protected $casts = [
        'sent_at' => 'datetime',
        'accepted_at' => 'datetime',
        'declined_at' => 'datetime',
        'expires_at' => 'datetime',
        'leader_status_set_at' => 'datetime',
    ];

    public function church(): BelongsTo
    {
        return $this->belongsTo(Church::class);
    }

    public function volunteer(): BelongsTo
    {
        return $this->belongsTo(Volunteer::class);
    }

    public function ministry(): BelongsTo
    {
        return $this->belongsTo(Ministry::class);
    }

    public function invitedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'invited_by_user_id');
    }

    public function slots(): HasMany
    {
        return $this->hasMany(VolunteerMinistryInvitationSlot::class, 'invitation_id');
    }

    public function leaderStatusHistory(): HasMany
    {
        return $this->hasMany(VolunteerMinistryInvitationStatusHistory::class, 'invitation_id')
            ->orderByDesc('created_at')
            ->orderByDesc('id');
    }

    public function isExpired(): bool
    {
        return $this->expires_at !== null && $this->expires_at->isPast();
    }

    public function isPending(): bool
    {
        return $this->status === 'pending' && ! $this->isExpired();
    }

    /**
     * Parágrafo principal do convite (e-mail / página pública), após a saudação com o nome.
     */
    public function resolvedIntroParagraph(): string
    {
        $custom = trim((string) ($this->intro_message ?? ''));
        if ($custom !== '') {
            return $custom;
        }
        $churchIntro = trim((string) ($this->church?->ministry_invitation_intro ?? ''));
        if ($churchIntro !== '') {
            return $churchIntro;
        }

        return self::builtinIntroForMinistry((string) ($this->ministry?->name ?? 'Departamento'));
    }

    public static function builtinIntroForMinistry(string $ministryName): string
    {
        return 'Você foi convidado(a) para servir no departamento '.$ministryName.'. Para continuar, por favor confirme a sua resposta.';
    }

    public static function createToken(): string
    {
        return Str::random(48);
    }
}
