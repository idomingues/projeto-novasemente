<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Marca transacional (e-mails)
    |--------------------------------------------------------------------------
    |
    | Usado nos templates em resources/views/vendor/mail e emails/*.
    | Logo: BRAND_LOGO_URL ou /logo-ns.png na APP_URL.
    |
    */

    // Preferir BRAND_NAME; se APP_NAME ainda for o placeholder "Laravel", usa Nova Semente.
    'name' => env('BRAND_NAME') ?: (
        ($appName = env('APP_NAME')) && strcasecmp((string) $appName, 'Laravel') !== 0
            ? $appName
            : 'Nova Semente'
    ),

    // Vazio por padrão: o cabeçalho dos e-mails mostra só logo + nome.
    'tagline' => env('BRAND_TAGLINE', ''),

    'logo_url' => env('BRAND_LOGO_URL'),

    'app_url' => env('BRAND_APP_URL', env('APP_URL', 'https://app.novasemente.com.br')),

    'footer_note' => 'Este é um e-mail automático. Em caso de dúvida, fale com a equipe da igreja.',

    'colors' => [
        'background' => '#f4f4f5',
        'surface' => '#ffffff',
        'border' => '#e4e4e7',
        'text' => '#18181b',
        'text_muted' => '#52525b',
        'text_faint' => '#a1a1aa',
        'primary' => '#18181b',
        'accent' => '#059669',
        'accent_dark' => '#065f46',
        'accent_soft' => '#ecfdf5',
        'accent_border' => '#a7f3d0',
        'hero_emerald_from' => '#0f766e',
        'hero_emerald_to' => '#134e4a',
        'hero_dark_from' => '#18181b',
        'hero_dark_to' => '#52525b',
    ],

];
