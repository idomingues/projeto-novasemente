<?php

namespace App\Support;

final class BibleAvatarCatalog
{
    /**
     * @return list<string>
     */
    public static function keys(): array
    {
        return array_column(self::all(), 'key');
    }

    /**
     * @return list<array{key: string, label: string, gender: string, image_url: string}>
     */
    public static function all(): array
    {
        $items = [];
        foreach (self::genderGroups() as $gender => $rows) {
            foreach ($rows as $row) {
                $items[] = [
                    'key' => $row['key'],
                    'label' => $row['label'],
                    'gender' => $gender,
                    'image_url' => self::publicUrlForGenderFile($gender, $row['file']),
                ];
            }
        }

        return $items;
    }

    /**
     * @return list<array{key: string, label: string, gender: string, image_url: string}>
     */
    public static function forGender(string $gender): array
    {
        return array_values(array_filter(
            self::all(),
            fn (array $item): bool => $item['gender'] === $gender
        ));
    }

    public static function isValidKey(?string $key): bool
    {
        if ($key === null || $key === '') {
            return false;
        }

        return in_array($key, self::keys(), true);
    }

    public static function urlForKey(string $key): ?string
    {
        foreach (self::all() as $item) {
            if ($item['key'] === $key) {
                return $item['image_url'];
            }
        }

        return null;
    }

    public static function publicUrlForGenderFile(string $gender, string $file): string
    {
        $path = 'images/bible-avatars/'.$gender.'/'.ltrim($file, '/');

        return asset($path);
    }

    /**
     * @return array<string, list<array{key: string, label: string, file: string}>>
     */
    private static function genderGroups(): array
    {
        /** @var array<string, list<array{key: string, label: string, file: string}>> $groups */
        $groups = config('bible_avatars', []);

        return $groups;
    }
}
