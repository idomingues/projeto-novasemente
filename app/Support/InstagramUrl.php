<?php

namespace App\Support;

class InstagramUrl
{
    /** Código curto de post, reel ou IGTV. */
    public static function shortcode(string $url): ?string
    {
        $url = trim($url);
        if ($url === '') {
            return null;
        }

        if (preg_match('#(?:https?://)?(?:www\.)?instagram\.com/(?:[\w.-]+/)?(?:p|reels?|tv)/([\w-]+)#i', $url, $m)) {
            return $m[1];
        }

        return null;
    }

    public static function isValidPostUrl(string $url): bool
    {
        return self::shortcode($url) !== null;
    }

    /** URL canónica para abrir no Instagram (app ou web). */
    public static function normalize(string $url): ?string
    {
        $code = self::shortcode($url);
        if ($code === null) {
            return null;
        }

        if (preg_match('#(?:https?://)?(?:www\.)?instagram\.com/(?:[\w.-]+/)?reels?/#i', $url)) {
            return "https://www.instagram.com/reel/{$code}/";
        }

        if (preg_match('#(?:https?://)?(?:www\.)?instagram\.com/(?:[\w.-]+/)?tv/#i', $url)) {
            return "https://www.instagram.com/tv/{$code}/";
        }

        return "https://www.instagram.com/p/{$code}/";
    }
}
