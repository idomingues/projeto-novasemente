<?php

namespace App\Support;

use App\Models\MissionAboutSection;

final class MissionAboutBootstrap
{
    /**
     * Garante os três blocos de «Quem somos» da Missão para a igreja.
     *
     * @return array<string, MissionAboutSection>
     */
    public static function sectionsForChurch(int $churchId): array
    {
        $sections = [];

        foreach (MissionAboutSection::DEFAULT_TITLES as $key => $title) {
            $sections[$key] = MissionAboutSection::query()->firstOrCreate(
                ['church_id' => $churchId, 'key' => $key],
                ['title' => $title, 'body' => null],
            );
        }

        return $sections;
    }
}
