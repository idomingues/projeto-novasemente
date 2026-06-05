<?php

namespace App\Services;

use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class SabbathSunsetService
{
    /**
     * Payload do banner da home mobile (sexta e sábado, fuso da igreja).
     *
     * @return array<string, mixed>|null
     */
    public function homeBannerPayload(): ?array
    {
        $timezone = (string) config('sabbath.timezone', 'America/Sao_Paulo');
        $now = Carbon::now($timezone);
        $dayOfWeek = (int) $now->dayOfWeek;

        if ($dayOfWeek !== Carbon::FRIDAY && $dayOfWeek !== Carbon::SATURDAY) {
            return null;
        }

        $imageUrl = (string) config('sabbath.banner_image', '/images/sabbath-sunset-bg.jpg');

        if ($dayOfWeek === Carbon::FRIDAY) {
            $fridaySunset = $this->sunsetForDate($now->toDateString(), $timezone);
            if ($fridaySunset === null || $now->greaterThanOrEqualTo($fridaySunset)) {
                return null;
            }

            return [
                'variant' => 'friday',
                'title' => 'Sábado começa em',
                'subtitle' => 'Pôr do sol de hoje',
                'sunset_at' => $fridaySunset->toIso8601String(),
                'sunset_time' => $fridaySunset->format('H:i'),
                'day_label' => 'Hoje, sexta-feira',
                'message' => 'Prepare seu coração para o sábado.',
                'image_url' => $imageUrl,
            ];
        }

        $saturdayFromHour = (int) config('sabbath.saturday_banner_from_hour', 15);
        if ($now->hour < $saturdayFromHour) {
            return null;
        }

        $saturdaySunset = $this->sunsetForDate($now->toDateString(), $timezone);
        if ($saturdaySunset === null || $now->greaterThanOrEqualTo($saturdaySunset)) {
            return null;
        }

        return [
            'variant' => 'saturday',
            'title' => 'Despedida do sábado',
            'subtitle' => 'Pôr do sol de hoje',
            'sunset_at' => $saturdaySunset->toIso8601String(),
            'sunset_time' => $saturdaySunset->format('H:i'),
            'day_label' => 'Hoje, sábado',
            'message' => 'Agradeça a Deus por este dia sagrado.',
            'image_url' => $imageUrl,
        ];
    }

    private function sunsetForDate(string $date, string $timezone): ?Carbon
    {
        $lat = (float) config('sabbath.latitude');
        $lng = (float) config('sabbath.longitude');

        $cacheKey = sprintf('sabbath:sunset:%s:%s:%s:%s', $lat, $lng, $date, $timezone);

        $cached = Cache::get($cacheKey);
        if ($cached instanceof Carbon) {
            return $cached->copy()->timezone($timezone);
        }
        if ($cached === false) {
            return null;
        }

        try {
            $response = Http::timeout(8)->get('https://api.sunrise-sunset.org/json', [
                'lat' => $lat,
                'lng' => $lng,
                'date' => $date,
                'formatted' => 0,
                'tzid' => $timezone,
            ]);
        } catch (\Throwable) {
            Cache::put($cacheKey, false, now()->addMinutes(15));

            return null;
        }

        if (! $response->ok()) {
            Cache::put($cacheKey, false, now()->addMinutes(15));

            return null;
        }

        $data = $response->json();
        if (! is_array($data) || ($data['status'] ?? '') !== 'OK') {
            Cache::put($cacheKey, false, now()->addMinutes(15));

            return null;
        }

        $sunsetRaw = $data['results']['sunset'] ?? null;
        if (! is_string($sunsetRaw) || trim($sunsetRaw) === '') {
            Cache::put($cacheKey, false, now()->addMinutes(15));

            return null;
        }

        $sunset = Carbon::parse($sunsetRaw, $timezone);
        Cache::put($cacheKey, $sunset, now()->addDay());

        return $sunset->copy();
    }
}
