<?php

namespace App\Support;

use App\Models\Culto;
use Illuminate\Support\Collection;

/**
 * Filtra episódios do culto por série atual e remove duplicatas do mesmo vídeo no YouTube.
 */
final class CultoEpisodeCatalog
{
    /**
     * Nome normalizado da série (ex.: «sem filtro» a partir de «Sem Filtro, Ep. 8 | …»).
     */
    public static function seriesKey(?string $title): ?string
    {
        if ($title === null) {
            return null;
        }

        $title = trim($title);
        if ($title === '') {
            return null;
        }

        $head = trim(explode('|', $title, 2)[0]);

        if (preg_match('/^(.+?),\s*Ep\.\s*\d+/iu', $head, $m)) {
            return self::normalizeSeriesLabel($m[1]);
        }

        if (preg_match('/^(.+?)\s+Ep\.\s*\d+/iu', $head, $m)) {
            return self::normalizeSeriesLabel($m[1]);
        }

        return self::normalizeSeriesLabel($head);
    }

    /**
     * Mantém só episódios da série do culto mais recente (por data de publicação).
     *
     * @param  Collection<int, Culto>  $cultos
     * @return Collection<int, Culto>
     */
    public static function filterToCurrentSeries(Collection $cultos): Collection
    {
        if ($cultos->isEmpty()) {
            return $cultos;
        }

        $currentKey = null;
        foreach ($cultos as $culto) {
            $key = self::seriesKey($culto->title);
            if ($key !== null && $key !== '') {
                $currentKey = $key;
                break;
            }
        }

        if ($currentKey === null) {
            return $cultos;
        }

        return $cultos->filter(function (Culto $culto) use ($currentKey): bool {
            $key = self::seriesKey($culto->title);

            return $key !== null && $key === $currentKey;
        })->values();
    }

    /**
     * Um registro por vídeo do YouTube (mantém o mais recente por id).
     *
     * @param  Collection<int, Culto>  $cultos
     * @return Collection<int, Culto>
     */
    public static function dedupeByYoutubeVideo(Collection $cultos): Collection
    {
        if ($cultos->isEmpty()) {
            return $cultos;
        }

        $keepIds = $cultos
            ->groupBy(function (Culto $culto): string {
                $videoId = Culto::youtubeVideoId($culto->youtube_url);

                return $videoId ?? 'row-'.$culto->id;
            })
            ->map(fn (Collection $group) => (int) $group->max('id'))
            ->values();

        return $cultos->filter(fn (Culto $culto) => $keepIds->contains($culto->id))->values();
    }

    private static function normalizeSeriesLabel(string $label): string
    {
        $label = trim($label, " \t\n\r\0\x0B,");

        return mb_strtolower($label);
    }
}
