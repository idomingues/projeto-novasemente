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
            'brandName' => (string) config('brand.name', 'Nova Semente'),
            'brandTagline' => (string) config('brand.tagline', ''),
            'brandAppUrl' => rtrim((string) config('brand.app_url', config('app.url', '/')), '/'),
            'brandLogoUrl' => (string) (config('brand.logo_url') ?: asset('logo-ns.png')),
            'brandColors' => config('brand.colors', []),
        ];
    }
}
