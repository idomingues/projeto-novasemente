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

    public function hasLinkedAppAccount(): bool
    {
        return $this->volunteer?->user_id !== null;
    }

    public static function builtinIntroForMinistry(string $ministryName): string
    {
        return 'Seja bem-vindo(a) ao departamento «'.$ministryName.'»! '
            .'Após aceitar este convite, o líder entrará em contato em breve pelo aplicativo Nova Semente. '
            .'Mantenha-se logado em https://app.novasemente.com.br ou baixe o app na App Store (Apple) ou na Google Play.';
    }

    public static function createToken(): string
    {
        return Str::random(48);
    }

    /**
     * Convite vigente que impede novo encaminhamento ao mesmo departamento.
     */
    /**
     * IDs dos convites vigentes que impedem novo encaminhamento ao mesmo departamento.
     *
     * @param  list<int>  $volunteerIds
     * @return array<int, list<int>>
     */
    public static function blockingMinistryIdsByVolunteerIds(int $churchId, array $volunteerIds): array
    {
        if ($volunteerIds === []) {
            return [];
        }

        $rows = static::query()
            ->where('church_id', $churchId)
            ->whereIn('volunteer_id', $volunteerIds)
            ->where(function ($q): void {
                $q->where('status', 'accepted')
                    ->orWhere(function ($q2): void {
                        $q2->where('status', 'pending')
                            ->where(function ($q3): void {
                                $q3->whereNull('expires_at')->orWhere('expires_at', '>', now());
                            });
                    });
            })
            ->get(['volunteer_id', 'ministry_id']);

        $grouped = [];
        foreach ($rows as $row) {
            $volunteerId = (int) $row->volunteer_id;
            $grouped[$volunteerId][] = (int) $row->ministry_id;
        }

        foreach ($grouped as $volunteerId => $ministryIds) {
            $grouped[$volunteerId] = array_values(array_unique($ministryIds));
        }

        return $grouped;
    }

    public static function findBlockingForMinistry(int $churchId, int $volunteerId, int $ministryId): ?self
    {
        return static::query()
            ->where('church_id', $churchId)
            ->where('volunteer_id', $volunteerId)
            ->where('ministry_id', $ministryId)
            ->where(function ($q): void {
                $q->where('status', 'accepted')
                    ->orWhere(function ($q2): void {
                        $q2->where('status', 'pending')
                            ->where(function ($q3): void {
                                $q3->whereNull('expires_at')->orWhere('expires_at', '>', now());
                            });
                    });
            })
            ->orderByDesc('id')
            ->first();
    }

    /**
     * IDs dos convites mais recentes por voluntário + departamento (para listagens).
     *
     * @param  list<int>  $ministryIds
     * @return \Illuminate\Database\Eloquent\Builder<self>
     */
    public static function queryLatestPerVolunteerMinistry(int $churchId, array $ministryIds): \Illuminate\Database\Eloquent\Builder
    {
        $latestIds = static::query()
            ->where('church_id', $churchId)
            ->whereIn('ministry_id', $ministryIds)
            ->selectRaw('MAX(id) as id')
            ->groupBy('volunteer_id', 'ministry_id');

        return static::query()->whereIn('id', $latestIds);
    }
}
