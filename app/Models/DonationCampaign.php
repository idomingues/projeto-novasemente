<?php

namespace App\Models;

use App\Support\StorageUrl;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DonationCampaign extends Model
{
    public const STATUS_ACTIVE = 'active';

    public const STATUS_CLOSED = 'closed';

    public const STATUS_ARCHIVED = 'archived';

    protected $fillable = [
        'church_id',
        'title',
        'description',
        'goal_amount',
        'raised_amount',
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
        'starts_at' => 'date',
        'ends_at' => 'date',
        'allow_over_goal' => 'boolean',
        'thanks_published_at' => 'datetime',
        'thanks_donors_notified_at' => 'datetime',
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
        return $this->hasMany(CampaignDonation::class, 'campaign_id');
    }

    public function photos(): HasMany
    {
        return $this->hasMany(DonationCampaignPhoto::class, 'campaign_id');
    }

    public function storyPhotos(): HasMany
    {
        return $this->photos()->where('kind', DonationCampaignPhoto::KIND_STORY)->orderBy('sort_order');
    }

    public function thanksPhotos(): HasMany
    {
        return $this->photos()->where('kind', DonationCampaignPhoto::KIND_THANKS)->orderBy('sort_order');
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

        if (! $this->allow_over_goal && (float) $this->raised_amount >= (float) $this->goal_amount) {
            return false;
        }

        return true;
    }

    public function remainingAmount(): float
    {
        return max(0, (float) $this->goal_amount - (float) $this->raised_amount);
    }

    public function progressPercent(): int
    {
        $goal = (float) $this->goal_amount;
        if ($goal <= 0) {
            return 0;
        }

        return (int) min(100, floor(((float) $this->raised_amount / $goal) * 100));
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
            ->map(fn (DonationCampaignPhoto $p) => [
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
            'goal_amount' => (float) $this->goal_amount,
            'raised_amount' => (float) $this->raised_amount,
            'remaining_amount' => $this->remainingAmount(),
            'progress_percent' => $this->progressPercent(),
            'status' => $this->status,
            'starts_at' => $this->starts_at?->format('Y-m-d'),
            'ends_at' => $this->ends_at?->format('Y-m-d'),
            'cover_image_url' => $this->cover_image_url,
            'accepting_donations' => $this->isAcceptingDonations(),
            'story_video_url' => $this->story_video_url,
            'story_youtube_embed_url' => $this->storyYoutubeEmbedUrl(),
            'story_photos' => $this->photosPayload(DonationCampaignPhoto::KIND_STORY),
            'thanks_is_published' => $this->thanksIsPublished(),
            'thanks_message' => $this->thanksIsPublished() ? $this->thanks_message : null,
            'thanks_published_at' => $this->thanks_published_at?->toIso8601String(),
            'thanks_photos' => $this->thanksIsPublished() ? $this->photosPayload(DonationCampaignPhoto::KIND_THANKS) : [],
        ];

        if ($includeDescription) {
            $data['description'] = $this->description;
        }

        return $data;
    }
}
