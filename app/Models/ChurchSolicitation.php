<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Pedidos formais à igreja. Tipos em {@see \App\Http\Controllers\MobileChurchSolicitationController}.
 *
 * `volunteer_request`: líder ou staff pede reforço de voluntários; `meta` com `ministry_id`,
 * `schedule_role_id` (opcional), `source` (`leader`|`staff`). Vários pedidos por quantidade:
 * `batch_key`, `batch_index`, `batch_total`; cumprimento: `fulfilled_*`.
 */
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
        'member_hidden_at',
        'leader_hidden_at',
        'staff_archived_at',
    ];

    protected function casts(): array
    {
        return [
            'meta' => 'array',
            'preferred_date' => 'date',
            'completed_at' => 'datetime',
            'member_hidden_at' => 'datetime',
            'leader_hidden_at' => 'datetime',
            'staff_archived_at' => 'datetime',
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
        if ($this->type === 'baptism') {
            return \App\Support\BaptismSolicitationStatus::allowsChat((string) $this->status);
        }

        if (in_array($this->type, [
            \App\Http\Controllers\MobileChurchSolicitationController::TYPE_VOLUNTEER_REQUEST,
            \App\Http\Controllers\MobileChurchSolicitationController::TYPE_COMMUNICATION_REQUEST,
        ], true)) {
            return in_array($this->status, ['pending', 'in_progress'], true);
        }

        if ($this->type === \App\Http\Controllers\MobileChurchSolicitationController::TYPE_PASTORAL_INFORMAL) {
            return $this->informalPastoralLinkedMemberUserId() !== null
                && \App\Support\PastoralSolicitationStatus::allowsChat((string) $this->status);
        }

        return \App\Support\PastoralSolicitationStatus::allowsChat((string) $this->status);
    }

    public function memberDisplayName(): string
    {
        if ($this->type === \App\Http\Controllers\MobileChurchSolicitationController::TYPE_PASTORAL_INFORMAL) {
            $name = trim((string) data_get($this->meta, 'requester_name', ''));
            if ($name !== '') {
                return $name;
            }
        }

        return $this->user?->name ?? 'Usuário #'.$this->user_id;
    }

    public function memberPhotoUrl(): ?string
    {
        return $this->memberContactUser()?->photo_url;
    }

    public function memberEmail(): ?string
    {
        $email = $this->memberContactUser()?->email;

        return is_string($email) && trim($email) !== '' ? trim($email) : null;
    }

    public function memberPhone(): ?string
    {
        $phone = $this->memberContactUser()?->phone;

        return is_string($phone) && trim($phone) !== '' ? trim($phone) : null;
    }

    /**
     * Usuário cujos dados de contato representam quem pediu (membro vinculado no registro informal).
     */
    public function memberContactUser(): ?User
    {
        if ($this->type === \App\Http\Controllers\MobileChurchSolicitationController::TYPE_PASTORAL_INFORMAL) {
            $uid = $this->informalPastoralLinkedMemberUserId();
            if ($uid === null) {
                return null;
            }

            if ($this->relationLoaded('user') && $this->user && (int) $this->user->id === $uid) {
                return $this->user;
            }

            return User::query()->whereKey($uid)->first(['id', 'name', 'email', 'phone', 'photo_url']);
        }

        return $this->user;
    }

    public function informalPastoralLinkedMemberUserId(): ?int
    {
        if ($this->type !== \App\Http\Controllers\MobileChurchSolicitationController::TYPE_PASTORAL_INFORMAL) {
            return null;
        }

        $uid = data_get($this->meta, 'requester_user_id');
        if (is_numeric($uid)) {
            return (int) $uid;
        }

        $createdBy = data_get($this->meta, 'created_by_user_id');
        if ((int) $this->user_id !== (int) $createdBy) {
            return (int) $this->user_id;
        }

        return null;
    }
}
