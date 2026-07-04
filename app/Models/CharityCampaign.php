<?php

namespace App\Models;

use App\Support\StorageUrl;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CharityCampaign extends Model
{
    public const TYPE_MONEY = 'money';

    public const TYPE_ITEMS = 'items';

    public const PROGRESS_MONEY = 'money';

    public const PROGRESS_QUANTITY = 'quantity';

    public const STATUS_ACTIVE = 'active';

    public const STATUS_CLOSED = 'closed';

    public const STATUS_ARCHIVED = 'archived';

    protected $fillable = [
        'church_id',
        'title',
        'description',
        'type',
        'progress_mode',
        'goal_amount',
        'raised_amount',
        'goal_quantity',
        'pledged_quantity',
        'collected_quantity',
        'unit_label',
        'status',
        'starts_at',
        'ends_at',
        'cover_image_path',
        'story_video_url',
        'thanks_message',
        'thanks_published_at',
        'thanks_donors_notified_at',
        'allow_over_goal',
        'created_by',
    ];

    protected $casts = [
        'goal_amount' => 'decimal:2',
        'raised_amount' => 'decimal:2',
        'goal_quantity' => 'integer',
        'pledged_quantity' => 'integer',
        'collected_quantity' => 'integer',
        'starts_at' => 'date',
        'ends_at' => 'date',
        'allow_over_goal' => 'boolean',
        'thanks_published_at' => 'datetime',
        'thanks_donors_notified_at' => 'datetime',
    ];

    protected $attributes = [
        'type' => self::TYPE_MONEY,
        'progress_mode' => self::PROGRESS_MONEY,
        'goal_amount' => 0,
        'raised_amount' => 0,
        'pledged_quantity' => 0,
        'collected_quantity' => 0,
        'allow_over_goal' => true,
    ];

    protected function coverImageUrl(): Attribute
    {
        return Attribute::make(
            get: fn () => $this->cover_image_path
                ? StorageUrl::publicMediaUrl($this->cover_image_path)
                : null,
        );
    }

    public function church(): BelongsTo
    {
        return $this->belongsTo(Church::class);
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function donations(): HasMany
    {
        return $this->hasMany(CharityDonation::class, 'campaign_id');
    }

    public function itemDonations(): HasMany
    {
        return $this->hasMany(CharityItemDonation::class, 'campaign_id');
    }

    public function photos(): HasMany
    {
        return $this->hasMany(CharityCampaignPhoto::class, 'campaign_id');
    }

    public function storyPhotos(): HasMany
    {
        return $this->photos()->where('kind', CharityCampaignPhoto::KIND_STORY)->orderBy('sort_order');
    }

    public function thanksPhotos(): HasMany
    {
        return $this->photos()->where('kind', CharityCampaignPhoto::KIND_THANKS)->orderBy('sort_order');
    }

    public static function youtubeEmbedUrl(?string $url): ?string
    {
        if ($url === null || trim($url) === '') {
            return null;
        }

        $id = Culto::youtubeVideoId(trim($url));

        return $id ? "https://www.youtube.com/embed/{$id}" : null;
    }

    public function storyYoutubeEmbedUrl(): ?string
    {
        return self::youtubeEmbedUrl($this->story_video_url);
    }

    public function thanksIsPublished(): bool
    {
        return $this->thanks_published_at !== null;
    }

    public function isMoneyCampaign(): bool
    {
        return $this->type !== self::TYPE_ITEMS;
    }

    public function isItemCampaign(): bool
    {
        return $this->type === self::TYPE_ITEMS;
    }

    public function isAcceptingDonations(): bool
    {
        if ($this->status !== self::STATUS_ACTIVE) {
            return false;
        }

        if ($this->starts_at !== null && $this->starts_at->copy()->startOfDay()->isFuture()) {
            return false;
        }

        if ($this->ends_at !== null && $this->ends_at->copy()->endOfDay()->isPast()) {
            return false;
        }

        if ($this->isItemCampaign()) {
            if (! $this->allow_over_goal && (int) $this->collected_quantity >= (int) $this->goal_quantity) {
                return false;
            }

            return true;
        }

        if (! $this->allow_over_goal && (float) $this->raised_amount >= (float) $this->goal_amount) {
            return false;
        }

        return true;
    }

    public function remainingAmount(): float
    {
        return max(0, (float) $this->goal_amount - (float) $this->raised_amount);
    }

    public function remainingQuantity(): int
    {
        return max(0, (int) $this->goal_quantity - (int) $this->collected_quantity);
    }

    public function progressPercent(): int
    {
        if ($this->isItemCampaign()) {
            $goal = (int) $this->goal_quantity;
            if ($goal <= 0) {
                return 0;
            }

            return (int) min(100, floor(((int) $this->collected_quantity / $goal) * 100));
        }

        $goal = (float) $this->goal_amount;
        if ($goal <= 0) {
            return 0;
        }

        return (int) min(100, floor(((float) $this->raised_amount / $goal) * 100));
    }

    public function recalculateItemProgress(): void
    {
        $pledgedQuantity = (int) $this->itemDonations()
            ->whereIn('status', [CharityItemDonation::STATUS_PLEDGED, CharityItemDonation::STATUS_RECEIVED])
            ->sum('quantity');

        $collectedQuantity = (int) $this->itemDonations()
            ->where('status', CharityItemDonation::STATUS_RECEIVED)
            ->sum('quantity');

        $this->forceFill([
            'pledged_quantity' => $pledgedQuantity,
            'collected_quantity' => $collectedQuantity,
        ])->save();
    }

    public function progressSummary(): array
    {
        if ($this->isItemCampaign()) {
            return [
                'value_mode' => self::PROGRESS_QUANTITY,
                'raised' => (int) $this->collected_quantity,
                'goal' => (int) $this->goal_quantity,
                'remaining' => $this->remainingQuantity(),
                'unit_label' => $this->unit_label,
                'pending' => max(0, (int) $this->pledged_quantity - (int) $this->collected_quantity),
            ];
        }

        return [
            'value_mode' => self::PROGRESS_MONEY,
            'raised' => (float) $this->raised_amount,
            'goal' => (float) $this->goal_amount,
            'remaining' => $this->remainingAmount(),
            'unit_label' => null,
            'pending' => null,
        ];
    }

    /**
     * @return array<int, array{id: int, image_url: string}>
     */
    public function photosPayload(string $kind): array
    {
        return $this->photos()
            ->where('kind', $kind)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get()
            ->map(fn (CharityCampaignPhoto $p) => [
                'id' => $p->id,
                'image_url' => $p->image_url,
            ])
            ->values()
            ->all();
    }

    public function toMobileArray(bool $includeDescription = false): array
    {
        $this->loadMissing(['photos']);

        $data = [
            'id' => $this->id,
            'title' => $this->title,
            'type' => $this->type,
            'progress_mode' => $this->progress_mode,
            'goal_amount' => (float) $this->goal_amount,
            'raised_amount' => (float) $this->raised_amount,
            'remaining_amount' => $this->remainingAmount(),
            'goal_quantity' => $this->goal_quantity,
            'pledged_quantity' => $this->pledged_quantity,
            'collected_quantity' => $this->collected_quantity,
            'remaining_quantity' => $this->remainingQuantity(),
            'unit_label' => $this->unit_label,
            'progress_percent' => $this->progressPercent(),
            'status' => $this->status,
            'starts_at' => $this->starts_at?->format('Y-m-d'),
            'ends_at' => $this->ends_at?->format('Y-m-d'),
            'cover_image_url' => $this->cover_image_url,
            'accepting_donations' => $this->isAcceptingDonations(),
            'story_video_url' => $this->story_video_url,
            'story_youtube_embed_url' => $this->storyYoutubeEmbedUrl(),
            'story_photos' => $this->photosPayload(CharityCampaignPhoto::KIND_STORY),
            'thanks_is_published' => $this->thanksIsPublished(),
            'thanks_message' => $this->thanksIsPublished() ? $this->thanks_message : null,
            'thanks_published_at' => $this->thanks_published_at?->toIso8601String(),
            'thanks_photos' => $this->thanksIsPublished() ? $this->photosPayload(CharityCampaignPhoto::KIND_THANKS) : [],
        ];

        if ($includeDescription) {
            $data['description'] = $this->description;
        }

        return $data;
    }
}
