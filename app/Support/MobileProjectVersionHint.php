<?php

namespace App\Support;

/**
 * Versão de marketing dos projectos Capacitor (fallback quando não há linha em app_versions nem APP_DISPLAY_VERSION).
 */
final class MobileProjectVersionHint
{
    public static function detect(): ?string
    {
        $android = self::fromAndroidGradle(base_path('android/app/build.gradle'));
        if ($android !== null && $android !== '') {
            return $android;
        }

        return self::fromIosPbx(base_path('ios/App/App.xcodeproj/project.pbxproj'));
    }

    private static function fromAndroidGradle(string $path): ?string
    {
        if (! is_readable($path)) {
            return null;
        }

        $content = @file_get_contents($path);
        if ($content === false) {
            return null;
        }

        if (preg_match('/versionName\s+["\']([^"\']+)["\']/', $content, $m)) {
            return trim($m[1]);
        }

        return null;
    }

    private static function fromIosPbx(string $path): ?string
    {
        if (! is_readable($path)) {
            return null;
        }

        $content = @file_get_contents($path);
        if ($content === false) {
            return null;
        }

        if (preg_match('/MARKETING_VERSION\s*=\s*([^;]+);/', $content, $m)) {
            $v = trim($m[1], " \t\n\r\0\x0B\"'");
            if ($v !== '' && $v !== '$(inherited)') {
                return $v;
            }
        }

        return null;
    }
}
