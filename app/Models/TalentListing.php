<?php

namespace App\Models;

use App\Support\StorageUrl;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TalentListing extends Model
{
    public const TYPE_OFFER = 'offer';

    public const TYPE_SEEK = 'seek';

    public const TYPE_EXCHANGE = 'exchange';

    public const STATUS_PENDING = 'pending';

    public const STATUS_APPROVED = 'approved';

    public const STATUS_REJECTED = 'rejected';

    public const STATUS_PAUSED = 'paused';

    public const STATUS_CLOSED = 'closed';

    protected $fillable = [
        'church_id',
        'user_id',
        'category_id',
        'title',
        'type',
        'description',
        'locality',
        'availability',
        'allows_exchange',
        'allows_negotiation',
        'notes',
        'photo_path',
        'status',
        'rejection_reason',
        'moderated_by',
        'moderated_at',
        'member_declaration_at',
    ];

    protected $casts = [
        'allows_exchange' => 'boolean',
        'allows_negotiation' => 'boolean',
        'moderated_at' => 'datetime',
        'member_declaration_at' => 'datetime',
    ];

    protected function photoUrl(): Attribute
    {
        return Attribute::make(
            get: fn () => $this->photo_path
                ? StorageUrl::publicMediaUrl($this->photo_path)
                : null,
        );
    }

    public function church(): BelongsTo
    {
        return $this->belongsTo(Church::class);
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(TalentCategory::class, 'category_id');
    }

    public function moderator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'moderated_by');
    }

    public function interests(): HasMany
    {
        return $this->hasMany(TalentInterest::class, 'listing_id');
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(TalentReview::class, 'listing_id');
    }

    public function reports(): HasMany
    {
        return $this->hasMany(TalentReport::class, 'listing_id');
    }

    public function isVisibleToMembers(): bool
    {
        return $this->status === self::STATUS_APPROVED;
    }

    public function isEditableByOwner(): bool
    {
        return in_array($this->status, [
            self::STATUS_PENDING,
            self::STATUS_APPROVED,
            self::STATUS_PAUSED,
        ], true);
    }

    public static function typeLabel(string $type): string
    {
        return match ($type) {
            self::TYPE_OFFER => 'Ofereço serviço',
            self::TYPE_SEEK => 'Procuro serviço',
            self::TYPE_EXCHANGE => 'Aceito troca',
            default => $type,
        };
    }

    public static function statusLabel(string $status): string
    {
        return match ($status) {
            self::STATUS_PENDING => 'Em análise',
            self::STATUS_APPROVED => 'Aprovado',
            self::STATUS_REJECTED => 'Rejeitado',
            self::STATUS_PAUSED => 'Pausado',
            self::STATUS_CLOSED => 'Encerrado',
            default => $status,
        };
    }
}
