<?php

return [
    /*
    | Coordenadas da sede (R. Cubatão, 48 — Paraíso, São Paulo) para pôr do sol via Sunrise-Sunset API.
    | https://sunrise-sunset.org/api
    */
    'latitude' => (float) env('SABBATH_LATITUDE', -23.574389),
    'longitude' => (float) env('SABBATH_LONGITUDE', -46.644722),
    'timezone' => env('SABBATH_TIMEZONE', 'America/Sao_Paulo'),
    'banner_image' => '/images/sabbath-sunset-bg.jpg',
];
