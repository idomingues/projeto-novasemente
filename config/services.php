<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'youtube' => [
        'api_key' => env('YOUTUBE_API_KEY'),
        'channel_id' => env('YOUTUBE_CHANNEL_ID'), // opcional: ID do canal (ex: UCxxx) se forHandle falhar
        'fallback_playlists' => [],
    ],

    'google' => [
        /**
         * Google Drive API v3 (somente leitura) — usado para tentar obter capa automática
         * (primeira imagem) de pastas públicas quando `cover_image_url` não for informada.
         *
         * Não usa OAuth do utilizador; somente API key (opcional).
         */
        'drive_api_key' => env('GOOGLE_DRIVE_API_KEY'),
    ],

    'ios_app_store_url' => env('IOS_APP_STORE_URL'),
    'native_ios_minimum_version' => env('NATIVE_IOS_MINIMUM_VERSION', '15.0'),

    /**
     * Firebase Cloud Messaging (HTTP v1) — push nativo iOS/Android via tokens FCM.
     *
     * Conta de serviço do Firebase (JSON):
     * - FCM_PROJECT_ID
     * - FCM_CLIENT_EMAIL
     * - FCM_PRIVATE_KEY (numa linha, com `\n` no lugar das quebras)
     */
    'fcm' => [
        'project_id' => env('FCM_PROJECT_ID'),
        'client_email' => env('FCM_CLIENT_EMAIL'),
        'private_key' => env('FCM_PRIVATE_KEY'),
    ],

];
