<?php

namespace App\Support;

use App\Models\PublicationComment;
use App\Models\PublicationLike;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Schema;

final class PublicationEngagement
{
    /**
     * @param  list<array<string, mixed>>  $items
     * @return list<array<string, mixed>>
     */
    public static function enrichItems(array $items, ?User $user, ?string $guestKey = null): array
    {
        if ($items === []) {
            return $items;
        }

        if (! Schema::hasTable('publication_likes') || ! Schema::hasTable('publication_comments')) {
            return array_map(static function (array $item): array {
                $item['likes_count'] = 0;
                $item['comments_count'] = 0;
                $item['liked_by_me'] = false;

                return $item;
            }, $items);
        }

        $pairs = [];
        foreach ($items as $item) {
            $type = (string) ($item['type'] ?? '');
            $id = self::subjectIdFromFeedItem($item);
            if ($type === '' || $id === null) {
                continue;
            }
            $pairs[$type.'|'.$id] = ['type' => $type, 'id' => $id];
        }

        if ($pairs === []) {
            return array_map(static function (array $item): array {
                $item['likes_count'] = (int) ($item['likes_count'] ?? 0);
                $item['comments_count'] = (int) ($item['comments_count'] ?? 0);
                $item['liked_by_me'] = (bool) ($item['liked_by_me'] ?? false);

                return $item;
            }, $items);
        }

        $likeCounts = self::countBySubject(PublicationLike::query(), $pairs);
        $commentCounts = self::countBySubject(PublicationComment::query(), $pairs);

        $likedByMe = [];
        if ($user !== null) {
            $likedByMe = self::likedKeysForUser($user->id, $pairs);
        } elseif (is_string($guestKey) && $guestKey !== '') {
            $likedByMe = self::likedKeysForGuest($guestKey, $pairs);
        }

        return array_map(static function (array $item) use ($likeCounts, $commentCounts, $likedByMe): array {
            $type = (string) ($item['type'] ?? '');
            $id = self::subjectIdFromFeedItem($item);
            $key = $type.'|'.($id ?? '');

            $item['likes_count'] = $id !== null ? (int) ($likeCounts[$key] ?? 0) : 0;
            // Comentários só na sessão Publicações (não em álbuns de fotos).
            $item['comments_count'] = ($id !== null && $type !== 'photos')
                ? (int) ($commentCounts[$key] ?? 0)
                : 0;
            $item['liked_by_me'] = $id !== null && isset($likedByMe[$key]);

            return $item;
        }, $items);
    }

    /**
     * @param  array<string, array{type: string, id: int}>  $pairs
     * @return array<string, int>
     */
    private static function countBySubject($query, array $pairs): array
    {
        $types = array_values(array_unique(array_column($pairs, 'type')));
        $ids = array_values(array_unique(array_column($pairs, 'id')));

        /** @var Collection<int, object{subject_type: string, subject_id: int|string, aggregate: int|string}> $rows */
        $rows = $query
            ->selectRaw('subject_type, subject_id, COUNT(*) as aggregate')
            ->whereIn('subject_type', $types)
            ->whereIn('subject_id', $ids)
            ->groupBy('subject_type', 'subject_id')
            ->get();

        $out = [];
        foreach ($rows as $row) {
            $key = $row->subject_type.'|'.$row->subject_id;
            if (! isset($pairs[$key])) {
                continue;
            }
            $out[$key] = (int) $row->aggregate;
        }

        return $out;
    }

    /**
     * @param  array<string, array{type: string, id: int}>  $pairs
     * @return array<string, true>
     */
    private static function likedKeysForUser(int $userId, array $pairs): array
    {
        $types = array_values(array_unique(array_column($pairs, 'type')));
        $ids = array_values(array_unique(array_column($pairs, 'id')));

        $rows = PublicationLike::query()
            ->where('user_id', $userId)
            ->whereIn('subject_type', $types)
            ->whereIn('subject_id', $ids)
            ->get(['subject_type', 'subject_id']);

        return self::keysFromLikeRows($rows, $pairs);
    }

    /**
     * @param  array<string, array{type: string, id: int}>  $pairs
     * @return array<string, true>
     */
    private static function likedKeysForGuest(string $guestKey, array $pairs): array
    {
        $types = array_values(array_unique(array_column($pairs, 'type')));
        $ids = array_values(array_unique(array_column($pairs, 'id')));

        $rows = PublicationLike::query()
            ->where('guest_key', $guestKey)
            ->whereNull('user_id')
            ->whereIn('subject_type', $types)
            ->whereIn('subject_id', $ids)
            ->get(['subject_type', 'subject_id']);

        return self::keysFromLikeRows($rows, $pairs);
    }

    /**
     * @param  Collection<int, PublicationLike>  $rows
     * @param  array<string, array{type: string, id: int}>  $pairs
     * @return array<string, true>
     */
    private static function keysFromLikeRows(Collection $rows, array $pairs): array
    {
        $out = [];
        foreach ($rows as $row) {
            $key = $row->subject_type.'|'.$row->subject_id;
            if (isset($pairs[$key])) {
                $out[$key] = true;
            }
        }

        return $out;
    }

    /**
     * @param  array<string, mixed>  $item
     */
    private static function subjectIdFromFeedItem(array $item): ?int
    {
        $feedId = (string) ($item['id'] ?? '');
        $parsed = PublicationSubject::parseFeedId($feedId);
        if ($parsed === null) {
            return null;
        }

        return $parsed['id'];
    }
}
