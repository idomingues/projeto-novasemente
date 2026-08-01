<?php

namespace App\Support;

final class BrandMail
{
    /**
     * Variáveis compartilhadas nos templates de e-mail (vendor/mail, emails/*).
     *
     * @return array{
     *     brandName: string,
     *     brandTagline: string,
     *     brandAppUrl: string,
     *     brandLogoUrl: string,
     *     brandColors: array<string, string>
     * }
     */
    public static function viewData(): array
    {
        return [
            'brandName' => self::displayName(),
            'brandTagline' => (string) config('brand.tagline', ''),
            'brandAppUrl' => rtrim((string) config('brand.app_url', config('app.url', '/')), '/'),
            'brandLogoUrl' => (string) (config('brand.logo_url') ?: asset('logo-ns.png')),
            'brandColors' => config('brand.colors', []),
        ];
    }

    /**
     * Nome exibido nos e-mails. Ignora o placeholder padrão do framework ("Laravel").
     */
    public static function displayName(): string
    {
        $name = trim((string) config('brand.name', ''));

        if ($name === '' || strcasecmp($name, 'Laravel') === 0) {
            $appName = trim((string) config('app.name', ''));
            if ($appName !== '' && strcasecmp($appName, 'Laravel') !== 0) {
                return $appName;
            }

            return 'Nova Semente';
        }

        return $name;
    }
}
