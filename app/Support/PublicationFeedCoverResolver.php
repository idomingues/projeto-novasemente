<?php

namespace App\Support;

use App\Models\AcervoItem;
use App\Models\CharityCampaign;
use App\Models\Church;
use App\Models\Culto;
use App\Models\DonationCampaign;
use App\Models\Event;
use App\Models\LibraryBook;
use App\Models\Musica;
use App\Models\News;
use App\Models\PhotoAlbum;
use App\Models\RevistaAdventistaArticle;
use App\Services\DriveFolderCoverService;

/** Resolve capas e miniaturas para o feed unificado de publicações. */
final class PublicationFeedCoverResolver
{
    public static function absoluteUrl(?string $url, string $baseUrl): ?string
    {
        $url = trim((string) ($url ?? ''));
        if ($url === '') {
            return null;
        }
        if (str_starts_with($url, 'http://') || str_starts_with($url, 'https://')) {
            return $url;
        }
        if (str_starts_with($url, '/')) {
            return rtrim($baseUrl, '/').$url;
        }

        return StorageUrl::publicMediaUrl($url) ?? rtrim($baseUrl, '/').'/'.ltrim($url, '/');
    }

    public static function youtubeThumb(?string $youtubeUrl): ?string
    {
        $id = Culto::youtubeVideoId((string) ($youtubeUrl ?? ''));

        return $id ? "https://img.youtube.com/vi/{$id}/mqdefault.jpg" : null;
    }

    public static function forNews(News $post, string $baseUrl, ?Church $church = null): ?string
    {
        $cover = $post->resolvedCoverUrl($baseUrl)
            ?? self::absoluteUrl($post->image_url, $baseUrl);

        if ($cover === null && $post->content_type === News::TYPE_PDF && filled($post->pdf_path)) {
            $cover = self::absoluteUrl($post->image_url, $baseUrl);
        }

        return self::finalize($cover, 'news', $church, $baseUrl);
    }

    public static function newsShowsPlayOverlay(News $post): bool
    {
        return (bool) $post->has_video;
    }

    public static function forHealth(News $post, string $baseUrl, ?Church $church = null): ?string
    {
        $cover = $post->resolvedCoverUrl($baseUrl)
            ?? self::absoluteUrl($post->image_url, $baseUrl);

        return self::finalize($cover, 'health', $church, $baseUrl);
    }

    public static function forCulto(Culto $culto, ?Church $church, string $baseUrl): ?string
    {
        return self::finalize(self::youtubeThumb($culto->youtube_url), 'culto', $church, $baseUrl);
    }

    public static function forMusica(Musica $musica, ?Church $church, string $baseUrl): ?string
    {
        $cover = $musica->youtube_thumb_url ?? self::youtubeThumb($musica->youtube_url);

        return self::finalize($cover, 'musica', $church, $baseUrl);
    }

    public static function forEvent(Event $event, string $baseUrl, ?Church $church = null): ?string
    {
        $cover = self::absoluteUrl($event->image_url, $baseUrl);
        if ($cover === null && $event->video_type === Event::VIDEO_YOUTUBE) {
            $cover = self::youtubeThumb($event->video_url);
        }

        return self::finalize($cover, 'events', $church, $baseUrl);
    }

    public static function eventShowsPlayOverlay(Event $event): bool
    {
        // Só se a capa exibida for a do vídeo (sem imagem própria).
        if (filled($event->image_url)) {
            return false;
        }

        if ($event->video_type === Event::VIDEO_YOUTUBE) {
            return self::youtubeThumb($event->video_url) !== null;
        }

        return $event->video_type === Event::VIDEO_INSTAGRAM && filled($event->video_url);
    }

    public static function forRevista(RevistaAdventistaArticle $article, ?Church $church, string $baseUrl): ?string
    {
        return self::finalize(self::absoluteUrl($article->image_url, $baseUrl), 'revista', $church, $baseUrl);
    }

    public static function forPhotoAlbum(
        PhotoAlbum $album,
        DriveFolderCoverService $drive,
        ?Church $church,
        string $baseUrl,
    ): ?string {
        $cover = PhotoAlbum::normalizeCoverUrl($album->cover_image_url);
        if ($cover === null) {
            $folderId = $album->drive_folder_id;
            if (is_string($folderId) && $folderId !== '') {
                $cover = $drive->coverUrlForPublicFolder($folderId);
            }
        }

        return self::finalize($cover, 'photos', $church, $baseUrl);
    }

    public static function forLibraryBook(LibraryBook $book, string $baseUrl, ?Church $church = null): ?string
    {
        $cover = $book->resolvedCoverUrl($baseUrl)
            ?? self::absoluteUrl($book->source_cover_url, $baseUrl);

        return self::finalize($cover, 'library', $church, $baseUrl);
    }

    public static function forCharityCampaign(CharityCampaign $campaign, ?Church $church, string $baseUrl): ?string
    {
        $cover = filled($campaign->cover_image_url) ? (string) $campaign->cover_image_url : null;
        if ($cover === null) {
            $cover = self::youtubeThumb($campaign->story_video_url);
        }
        if ($cover === null) {
            $firstStory = $campaign->relationLoaded('storyPhotos')
                ? $campaign->storyPhotos->first()
                : $campaign->storyPhotos()->orderBy('sort_order')->first();
            $cover = $firstStory?->image_url;
        }

        return self::finalize($cover, 'charity_donation', $church, $baseUrl);
    }

    public static function charityShowsPlayOverlay(CharityCampaign $campaign): bool
    {
        // Capa de foto não recebe play só porque existe vídeo na história.
        if (filled($campaign->cover_image_url)) {
            return false;
        }

        return filled($campaign->story_video_url) && self::youtubeThumb($campaign->story_video_url) !== null;
    }

    public static function forDonationCampaign(DonationCampaign $campaign, ?Church $church, string $baseUrl): ?string
    {
        $cover = filled($campaign->cover_image_url) ? (string) $campaign->cover_image_url : null;
        if ($cover === null) {
            $cover = self::youtubeThumb($campaign->story_video_url);
        }
        if ($cover === null) {
            $firstStory = $campaign->relationLoaded('storyPhotos')
                ? $campaign->storyPhotos->first()
                : $campaign->storyPhotos()->orderBy('sort_order')->first();
            $cover = $firstStory?->image_url;
        }

        return self::finalize($cover, 'donation_campaign', $church, $baseUrl);
    }

    public static function donationShowsPlayOverlay(DonationCampaign $campaign): bool
    {
        if (filled($campaign->cover_image_url)) {
            return false;
        }

        return filled($campaign->story_video_url) && self::youtubeThumb($campaign->story_video_url) !== null;
    }

    public static function forAcervo(AcervoItem $item, ?Church $church, string $baseUrl): ?string
    {
        $cover = trim((string) ($item->thumbnail_url ?? ''));
        if ($cover === '') {
            $cover = self::youtubeThumb((string) ($item->url ?? '')) ?? '';
        }

        return self::finalize($cover !== '' ? $cover : null, 'acervo', $church, $baseUrl);
    }

    /** Play só quando a capa veio de um vídeo do YouTube (sem thumbnail própria de série). */
    public static function acervoShowsPlayOverlay(AcervoItem $item): bool
    {
        if (filled(trim((string) ($item->thumbnail_url ?? '')))) {
            return false;
        }

        return self::youtubeThumb((string) ($item->url ?? '')) !== null;
    }

    public static function cultoShowsPlayOverlay(Culto $culto): bool
    {
        return self::youtubeThumb($culto->youtube_url) !== null;
    }

    public static function musicaShowsPlayOverlay(Musica $musica): bool
    {
        return filled($musica->youtube_thumb_url) || self::youtubeThumb($musica->youtube_url) !== null;
    }

    public static function forPrayer(?Church $church, string $baseUrl): ?string
    {
        return self::finalize(
            $church !== null ? self::absoluteUrl($church->logo_url, $baseUrl) : null,
            'prayer',
            $church,
            $baseUrl,
        );
    }

    private static function finalize(?string $cover, string $type, ?Church $church, string $baseUrl): ?string
    {
        if (filled($cover)) {
            return $cover;
        }

        $configured = config("publications_feed.default_covers.{$type}");
        if (is_string($configured) && trim($configured) !== '') {
            return self::absoluteUrl($configured, $baseUrl);
        }

        if (config('publications_feed.use_church_logo_as_fallback', true) && $church !== null) {
            $logo = self::absoluteUrl($church->logo_url, $baseUrl);
            if ($logo !== null) {
                return $logo;
            }
        }

        $global = config('publications_feed.fallback_cover');
        if (is_string($global) && trim($global) !== '') {
            return self::absoluteUrl($global, $baseUrl);
        }

        return null;
    }
}
