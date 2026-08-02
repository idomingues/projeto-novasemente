<?php

namespace App\Models;

use App\Support\CaixaFixoIgrejaStoryDefaults;
use App\Support\ConstrucaoIgrejaStoryDefaults;
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
        'show_caixa_fixo_story',
        'caixa_fixo_story',
        'show_construcao_story',
        'construcao_story',
        'created_by',
    ];

    protected $casts = [
        'goal_amount' => 'decimal:2',
        'raised_amount' => 'decimal:2',
        'starts_at' => 'date',
        'ends_at' => 'date',
        'allow_over_goal' => 'boolean',
        'show_caixa_fixo_story' => 'boolean',
        'caixa_fixo_story' => 'array',
        'show_construcao_story' => 'boolean',
        'construcao_story' => 'array',
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

    /**
     * História financeira do Caixa Fixo (valores editáveis + defaults).
     *
     * @return array{
     *     monthly_total: float,
     *     cost_items: list<array{label: string, percent: float, amount: float, tone: string, compact?: bool}>,
     *     annual_year: int,
     *     annual_lines: list<array{label: string, amount: float, tone: string, emphasize?: bool, flow?: string}>
     * }
     */
    public function resolvedCaixaFixoStory(): array
    {
        $defaults = CaixaFixoIgrejaStoryDefaults::financial();
        $stored = is_array($this->caixa_fixo_story) ? $this->caixa_fixo_story : null;

        if ($stored === null) {
            return $defaults;
        }

        $monthlyTotal = isset($stored['monthly_total'])
            ? round((float) $stored['monthly_total'], 2)
            : $defaults['monthly_total'];

        $costItems = $defaults['cost_items'];
        if (isset($stored['cost_items']) && is_array($stored['cost_items']) && $stored['cost_items'] !== []) {
            $costItems = [];
            foreach ($stored['cost_items'] as $item) {
                if (! is_array($item) || ! isset($item['label'], $item['amount'], $item['tone'])) {
                    continue;
                }
                $amount = round((float) $item['amount'], 2);
                $percent = isset($item['percent'])
                    ? round((float) $item['percent'], 2)
                    : ($monthlyTotal > 0 ? round(($amount / $monthlyTotal) * 100, 2) : 0.0);
                $row = [
                    'label' => (string) $item['label'],
                    'percent' => $percent,
                    'amount' => $amount,
                    'tone' => (string) $item['tone'],
                ];
                if (! empty($item['compact'])) {
                    $row['compact'] = true;
                }
                $costItems[] = $row;
            }
            if ($costItems === []) {
                $costItems = $defaults['cost_items'];
            }
        }

        $annualLines = $defaults['annual_lines'];
        if (isset($stored['annual_lines']) && is_array($stored['annual_lines']) && $stored['annual_lines'] !== []) {
            $annualLines = [];
            foreach ($stored['annual_lines'] as $line) {
                if (! is_array($line) || ! isset($line['label'], $line['amount'], $line['tone'])) {
                    continue;
                }
                $row = [
                    'label' => (string) $line['label'],
                    'amount' => round((float) $line['amount'], 2),
                    'tone' => (string) $line['tone'],
                ];
                if (! empty($line['emphasize'])) {
                    $row['emphasize'] = true;
                }
                if (isset($line['flow']) && in_array($line['flow'], ['in', 'out'], true)) {
                    $row['flow'] = $line['flow'];
                }
                $annualLines[] = $row;
            }
            if ($annualLines === []) {
                $annualLines = $defaults['annual_lines'];
            }
        }

        return [
            'monthly_total' => $monthlyTotal,
            'cost_items' => $costItems,
            'annual_year' => isset($stored['annual_year'])
                ? (int) $stored['annual_year']
                : $defaults['annual_year'],
            'annual_lines' => $annualLines,
        ];
    }

    /**
     * História da Construção da Igreja (valores editáveis + defaults).
     *
     * @return array{
     *     launch_date: string,
     *     as_of_date: string,
     *     raised_amount: float,
     *     eyebrow: string,
     *     title: string,
     *     paragraphs: list<string>,
     *     highlights: list<string>
     * }
     */
    public function resolvedConstrucaoStory(): array
    {
        $defaults = ConstrucaoIgrejaStoryDefaults::story();
        $stored = is_array($this->construcao_story) ? $this->construcao_story : null;

        if ($stored === null) {
            return $defaults;
        }

        $paragraphs = $defaults['paragraphs'];
        if (isset($stored['paragraphs']) && is_array($stored['paragraphs']) && $stored['paragraphs'] !== []) {
            $paragraphs = array_values(array_filter(array_map(
                fn ($p) => is_string($p) ? trim($p) : '',
                $stored['paragraphs']
            )));
            if ($paragraphs === []) {
                $paragraphs = $defaults['paragraphs'];
            }
        }

        $highlights = $defaults['highlights'];
        if (isset($stored['highlights']) && is_array($stored['highlights']) && $stored['highlights'] !== []) {
            $highlights = array_values(array_filter(array_map(
                fn ($h) => is_string($h) ? trim($h) : '',
                $stored['highlights']
            )));
            if ($highlights === []) {
                $highlights = $defaults['highlights'];
            }
        }

        return [
            'launch_date' => isset($stored['launch_date']) && is_string($stored['launch_date']) && $stored['launch_date'] !== ''
                ? $stored['launch_date']
                : $defaults['launch_date'],
            'as_of_date' => isset($stored['as_of_date']) && is_string($stored['as_of_date']) && $stored['as_of_date'] !== ''
                ? $stored['as_of_date']
                : $defaults['as_of_date'],
            'raised_amount' => isset($stored['raised_amount'])
                ? round((float) $stored['raised_amount'], 2)
                : $defaults['raised_amount'],
            'eyebrow' => isset($stored['eyebrow']) && is_string($stored['eyebrow']) && trim($stored['eyebrow']) !== ''
                ? trim($stored['eyebrow'])
                : $defaults['eyebrow'],
            'title' => isset($stored['title']) && is_string($stored['title']) && trim($stored['title']) !== ''
                ? trim($stored['title'])
                : $defaults['title'],
            'paragraphs' => $paragraphs,
            'highlights' => $highlights,
        ];
    }

    public function hasProtectedStory(): bool
    {
        return (bool) $this->show_caixa_fixo_story || (bool) $this->show_construcao_story;
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
            'show_caixa_fixo_story' => (bool) $this->show_caixa_fixo_story,
            'caixa_fixo_story' => $this->show_caixa_fixo_story ? $this->resolvedCaixaFixoStory() : null,
            'show_construcao_story' => (bool) $this->show_construcao_story,
            'construcao_story' => $this->show_construcao_story ? $this->resolvedConstrucaoStory() : null,
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
