<?php

namespace App\Models;

use App\Support\SharedTalentListingStatus;
use App\Support\StorageUrl;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SharedTalentListing extends Model
{
    public const STATUS_PENDING = 'pending';

    public const STATUS_APPROVED = 'approved';

    public const STATUS_REJECTED = 'rejected';

    public const STATUS_ACTIVE = 'active';

    public const STATUS_PAUSED = 'paused';

    public const STATUS_CLOSED = 'closed';

    public const STATUS_FULL = 'full';

    public const MODALITY_IN_PERSON = 'in_person';

    public const MODALITY_ONLINE = 'online';

    public const MODALITY_HYBRID = 'hybrid';

    public const AGE_ALL = 'all';

    public const AGE_CHILDREN = 'children';

    public const AGE_TEENS = 'teens';

    public const AGE_ADULTS = 'adults';

    public const AGE_SENIORS = 'seniors';

    public const AGE_CUSTOM = 'custom';

    protected $fillable = [
        'church_id',
        'user_id',
        'category_id',
        'title',
        'description',
        'slots_total',
        'slots_filled',
        'age_range',
        'age_range_notes',
        'modality',
        'locality',
        'available_days',
        'schedule_time',
        'frequency',
        'duration_estimate',
        'notes',
        'photo_path',
        'status',
        'rejection_reason',
        'moderated_by',
        'moderated_at',
        'member_declaration_at',
    ];

    protected $casts = [
        'slots_total' => 'integer',
        'slots_filled' => 'integer',
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
        return $this->belongsTo(SharedTalentCategory::class, 'category_id');
    }

    public function moderator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'moderated_by');
    }

    public function enrollments(): HasMany
    {
        return $this->hasMany(SharedTalentEnrollment::class, 'listing_id');
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(SharedTalentReview::class, 'listing_id');
    }

    public function reports(): HasMany
    {
        return $this->hasMany(SharedTalentReport::class, 'listing_id');
    }

    public function announcements(): HasMany
    {
        return $this->hasMany(SharedTalentAnnouncement::class, 'listing_id');
    }

    public function slotsRemaining(): int
    {
        return max(0, $this->slots_total - $this->slots_filled);
    }

    public function isVisibleInCatalog(): bool
    {
        return SharedTalentListingStatus::isCatalogVisible($this->status);
    }

    public function acceptsEnrollments(): bool
    {
        return in_array($this->status, [self::STATUS_ACTIVE, self::STATUS_FULL], true)
            && $this->slotsRemaining() > 0;
    }

    public function isEditableByOwner(): bool
    {
        return in_array($this->status, [
            self::STATUS_PENDING,
            self::STATUS_ACTIVE,
            self::STATUS_PAUSED,
            self::STATUS_FULL,
        ], true);
    }

    public static function modalityLabel(string $modality): string
    {
        return match ($modality) {
            self::MODALITY_IN_PERSON => 'Presencial',
            self::MODALITY_ONLINE => 'Online',
            self::MODALITY_HYBRID => 'Híbrido',
            default => $modality,
        };
    }

    public static function ageRangeLabel(string $ageRange): string
    {
        return match ($ageRange) {
            self::AGE_ALL => 'Todas as idades',
            self::AGE_CHILDREN => 'Crianças',
            self::AGE_TEENS => 'Adolescentes',
            self::AGE_ADULTS => 'Adultos',
            self::AGE_SENIORS => 'Idosos',
            self::AGE_CUSTOM => 'Faixa específica',
            default => $ageRange,
        };
    }

    public static function statusLabel(string $status): string
    {
        return SharedTalentListingStatus::label($status);
    }
}
