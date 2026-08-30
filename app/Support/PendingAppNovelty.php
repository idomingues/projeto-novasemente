<?php

namespace App\Support;

use App\Models\AppNovelty;
use App\Models\Church;
use App\Models\User;
use App\Models\UserDismissedAppNovelty;
use Illuminate\Support\Facades\Schema;

/**
 * Próxima novidade do APP ainda não vista pelo membro.
 *
 * @phpstan-type PendingNovelty array{
 *     id: int,
 *     title: string,
 *     body: string,
 *     module_key: string,
 *     module_label: string,
 *     href: string
 * }
 */
final class PendingAppNovelty
{
    /**
     * @return PendingNovelty|null
     */
    public static function forUser(?User $user, ?Church $church): ?array
    {
        if ($user === null || $church === null) {
            return null;
        }

        if (! Schema::hasTable('app_novelties') || ! Schema::hasTable('user_dismissed_app_novelties')) {
            return null;
        }

        $dismissedIds = UserDismissedAppNovelty::query()
            ->where('user_id', $user->id)
            ->pluck('app_novelty_id');

        $novelties = AppNovelty::query()
            ->where('church_id', $church->id)
            ->where('is_active', true)
            ->whereNotNull('published_at')
            ->where('published_at', '<=', now())
            ->when($dismissedIds->isNotEmpty(), fn ($q) => $q->whereNotIn('id', $dismissedIds))
            ->orderByDesc('published_at')
            ->orderByDesc('id')
            ->get();

        foreach ($novelties as $novelty) {
            $module = AppNoveltyModules::find((string) $novelty->module_key, $church);
            if ($module === null) {
                continue;
            }

            $href = AppNoveltyModules::href((string) $novelty->route_name)
                ?? AppNoveltyModules::href($module['route']);
            if ($href === null) {
                continue;
            }

            return [
                'id' => (int) $novelty->id,
                'title' => (string) $novelty->title,
                'body' => (string) $novelty->body,
                'module_key' => $module['key'],
                'module_label' => $module['label'],
                'href' => $href,
            ];
        }

        return null;
    }
}
