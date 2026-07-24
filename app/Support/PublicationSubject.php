<?php

namespace App\Support;

use App\Models\CharityCampaign;
use App\Models\Culto;
use App\Models\DonationCampaign;
use App\Models\Event;
use App\Models\LibraryBook;
use App\Models\Musica;
use App\Models\News;
use App\Models\PhotoAlbum;
use App\Models\RevistaAdventistaArticle;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

final class PublicationSubject
{
    /** Types with church_id column scoped to the working church (nullable = global allowed). */
    private const CHURCH_SCOPED_TYPES = [
        'news',
        'health',
        'culto',
        'charity_donation',
        'library',
        'photos',
        'events',
        'musica',
        'donation_campaign',
    ];

    /**
     * @return array{type: string, id: int}|null
     */
    public static function parseFeedId(string $feedId): ?array
    {
        $feedId = trim($feedId);
        if ($feedId === '' || ! str_contains($feedId, '-')) {
            return null;
        }

        $pos = strrpos($feedId, '-');
        if ($pos === false) {
            return null;
        }

        $type = substr($feedId, 0, $pos);
        $idRaw = substr($feedId, $pos + 1);
        if ($type === '' || $idRaw === '' || ! ctype_digit($idRaw)) {
            return null;
        }

        if (! array_key_exists($type, PublicationFeed::TYPE_DEFINITIONS)) {
            return null;
        }

        return [
            'type' => $type,
            'id' => (int) $idRaw,
        ];
    }

    public static function feedId(string $type, int $id): string
    {
        return $type.'-'.$id;
    }

    public static function typeLabel(string $type): string
    {
        return PublicationFeed::TYPE_DEFINITIONS[$type]['label'] ?? $type;
    }

    public static function exists(string $type, int $id, ?int $churchId = null): bool
    {
        $query = self::baseQuery($type, $id);
        if ($query === null) {
            return false;
        }

        if ($churchId !== null && in_array($type, self::CHURCH_SCOPED_TYPES, true)) {
            $query->where(function ($q) use ($churchId) {
                $q->where('church_id', $churchId)->orWhereNull('church_id');
            });
        }

        return $query->exists();
    }

    public static function title(string $type, int $id): ?string
    {
        $query = self::baseQuery($type, $id);
        if ($query === null) {
            return null;
        }

        /** @var Model|null $model */
        $model = $query->first();
        if ($model === null) {
            return null;
        }

        foreach (['title', 'name'] as $attr) {
            $value = $model->getAttribute($attr);
            if (is_string($value) && trim($value) !== '') {
                return trim($value);
            }
        }

        return null;
    }

    /**
     * @return Builder<Model>|null
     */
    private static function baseQuery(string $type, int $id): ?Builder
    {
        $modelClass = match ($type) {
            'news', 'health' => News::class,
            'culto' => Culto::class,
            'charity_donation' => CharityCampaign::class,
            'library' => LibraryBook::class,
            'photos' => PhotoAlbum::class,
            'events' => Event::class,
            'revista' => RevistaAdventistaArticle::class,
            'musica' => Musica::class,
            'donation_campaign' => DonationCampaign::class,
            default => null,
        };

        if ($modelClass === null) {
            return null;
        }

        $query = $modelClass::query()->whereKey($id);

        if ($type === 'news') {
            $query->where('section', News::SECTION_NEWS);
        } elseif ($type === 'health') {
            $query->where('section', News::SECTION_HEALTH);
        }

        return $query;
    }
}
