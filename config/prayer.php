<?php

return [

    'request_moderation' => [
        'enabled' => env('PRAYER_REQUEST_MODERATION_ENABLED', true),
        'openai_api_key' => env('OPENAI_API_KEY'),
        'model' => env('OPENAI_MODERATION_MODEL', 'omni-moderation-latest'),
        'timeout_seconds' => (int) env('OPENAI_MODERATION_TIMEOUT', 12),
        /** Termos usados só se a API da OpenAI não estiver configurada ou falhar. */
        'heuristic_terms' => [],
    ],
];

