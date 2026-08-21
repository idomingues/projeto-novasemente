<?php

namespace App\Support;

use App\Models\Event;
use App\Models\Musica;
use Carbon\Carbon;
use Carbon\CarbonInterface;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class EventFormSupport
{
    /** @return array<string, mixed> */
    public static function validationRules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'starts_at' => ['required', 'date'],
            'ends_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
            'published_at' => ['nullable', 'date'],
            'all_day' => ['boolean'],
            'location' => ['nullable', 'string', 'max:255'],
            'price' => ['nullable', 'string', 'max:2000'],
            'purchase_url' => ['nullable', 'string', 'max:2048', 'url'],
            'video_type' => ['nullable', 'string', Rule::in([Event::VIDEO_YOUTUBE, Event::VIDEO_INSTAGRAM])],
            'video_url' => ['nullable', 'string', 'max:500'],
            'image_url' => ['nullable', 'string', 'max:1024'],
            'image_file' => ['nullable', 'image', 'max:4096'],
            'color' => ['nullable', 'string', 'max:50'],
        ];
    }

    public static function mergeEmptyOptionalRequestFields(Request $request): void
    {
        if ($request->input('ends_at') === '' || $request->input('ends_at') === null) {
            $request->merge(['ends_at' => null]);
        }
        if ($request->input('published_at') === '' || $request->input('published_at') === null) {
            $request->merge(['published_at' => null]);
        }
        $rawPurchaseIn = $request->input('purchase_url');
        if (! is_string($rawPurchaseIn) || trim($rawPurchaseIn) === '') {
            $request->merge(['purchase_url' => null]);
        }
        $rawVideoType = $request->input('video_type');
        if (! is_string($rawVideoType) || trim($rawVideoType) === '') {
            $request->merge(['video_type' => null, 'video_url' => null]);
        }
        $request->merge(['all_day' => $request->boolean('all_day')]);
    }

    /**
     * Interpreta datetime-local / date do formulário no fuso da aplicação (America/Sao_Paulo).
     * Sem isto, `2026-08-01T14:00` pode ser lido como UTC e voltar no modal com outro horário.
     */
    public static function parseFormDateTime(mixed $value, bool $endOfDay = false): ?CarbonInterface
    {
        if ($value instanceof CarbonInterface) {
            return $value;
        }
        if (! is_string($value)) {
            return null;
        }
        $raw = trim($value);
        if ($raw === '') {
            return null;
        }

        $tz = (string) config('app.timezone', 'America/Sao_Paulo');

        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $raw) === 1) {
            $date = Carbon::createFromFormat('Y-m-d', $raw, $tz);
            if ($date === false) {
                return null;
            }

            return $endOfDay ? $date->copy()->endOfDay() : $date->copy()->startOfDay();
        }

        if (preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/', $raw) === 1) {
            $date = Carbon::createFromFormat('Y-m-d\TH:i', $raw, $tz);

            return $date === false ? null : $date;
        }

        if (preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/', $raw) === 1) {
            $date = Carbon::createFromFormat('Y-m-d\TH:i:s', $raw, $tz);

            return $date === false ? null : $date;
        }

        return Carbon::parse($raw, $tz);
    }

    /** @param  array<string, mixed>  $data */
    public static function normalizeValidatedPayload(array &$data): void
    {
        $allDay = (bool) ($data['all_day'] ?? false);
        $data['all_day'] = $allDay;
        $data['starts_at'] = self::parseFormDateTime($data['starts_at'] ?? null, false);
        $data['ends_at'] = self::parseFormDateTime($data['ends_at'] ?? null, $allDay);
        $data['published_at'] = self::parseFormDateTime($data['published_at'] ?? null);
        $rawPrice = $data['price'] ?? null;
        $data['price'] = is_string($rawPrice) && trim($rawPrice) !== '' ? trim($rawPrice) : null;

        $rawPurchase = $data['purchase_url'] ?? null;
        $data['purchase_url'] = is_string($rawPurchase) && trim($rawPurchase) !== '' ? trim($rawPurchase) : null;

        self::normalizeVideoFields($data);
    }

    /** @param  array<string, mixed>  $data */
    public static function normalizeVideoFields(array &$data): void
    {
        $type = trim((string) ($data['video_type'] ?? ''));
        if ($type === '') {
            $data['video_type'] = null;
            $data['video_url'] = null;

            return;
        }

        $url = trim((string) ($data['video_url'] ?? ''));
        if ($url === '') {
            throw ValidationException::withMessages([
                'video_url' => $type === Event::VIDEO_YOUTUBE
                    ? 'Informe o link do vídeo no YouTube.'
                    : 'Informe o link da publicação no Instagram.',
            ]);
        }

        if ($type === Event::VIDEO_YOUTUBE) {
            if (Musica::youtubeVideoId($url) === null) {
                throw ValidationException::withMessages([
                    'video_url' => 'Link do YouTube inválido.',
                ]);
            }
            $data['video_url'] = $url;
            $data['video_type'] = Event::VIDEO_YOUTUBE;

            return;
        }

        if ($type === Event::VIDEO_INSTAGRAM) {
            $normalized = InstagramUrl::normalize($url);
            if ($normalized === null) {
                throw ValidationException::withMessages([
                    'video_url' => 'Link do Instagram inválido. Use um link de post, reel ou IGTV.',
                ]);
            }
            $data['video_url'] = $normalized;
            $data['video_type'] = Event::VIDEO_INSTAGRAM;

            return;
        }

        throw ValidationException::withMessages([
            'video_type' => 'Tipo de vídeo inválido.',
        ]);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public static function resolveImageUrl(Request $request, array $data, ?string $existing, string $storageFolder): ?string
    {
        $imageUrl = isset($data['image_url']) && trim((string) $data['image_url']) !== ''
            ? trim((string) $data['image_url'])
            : $existing;
        if ($request->hasFile('image_file')) {
            $path = $request->file('image_file')->store($storageFolder, 'public');
            $imageUrl = StorageUrl::publicMediaUrl($path);
        }

        return $imageUrl;
    }

    /** @return array<string, mixed> */
    public static function mobileListPayload(
        int $id,
        string $title,
        ?string $description,
        \Carbon\CarbonInterface $startsAt,
        ?\Carbon\CarbonInterface $endsAt,
        bool $allDay,
        ?string $location,
        ?string $price,
        ?string $purchaseUrl,
        ?string $videoType,
        ?string $videoUrl,
        ?string $youtubeEmbedUrl,
        ?string $imageUrl,
        ?string $color,
    ): array {
        if ($imageUrl && ! str_starts_with($imageUrl, 'http')) {
            $imageUrl = request()->getSchemeAndHttpHost().$imageUrl;
        }

        return [
            'id' => $id,
            'title' => $title,
            'description' => $description,
            'starts_at' => $startsAt->toIso8601String(),
            'ends_at' => $endsAt?->toIso8601String(),
            'all_day' => $allDay,
            'location' => $location,
            'price' => $price,
            'purchase_url' => $purchaseUrl,
            'video_type' => $videoType,
            'video_url' => $videoUrl,
            'youtube_embed_url' => $youtubeEmbedUrl,
            'image_url' => $imageUrl,
            'color' => $color,
        ];
    }
}
