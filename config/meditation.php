<?php

return [
    'timezone' => env('SABBATH_TIMEZONE', 'America/Sao_Paulo'),
    /** Job `app:publish-meditation-daily-feed` (routes/console.php). */
    'publish_hour' => (int) env('MEDITATION_PUBLISH_HOUR', 5),
    /** Banner da home some neste horário (não incluso). */
    'home_banner_until_hour' => (int) env('MEDITATION_HOME_BANNER_UNTIL_HOUR', 10),
    'banner_image' => '/images/sabbath-sunset-bg.jpg',
    /**
     * Em local, ignora o horário e usa a última meditação publicada para preview.
     * Produção: deixe false (ou omita).
     */
    'home_banner_preview' => (bool) env('MEDITATION_HOME_BANNER_PREVIEW', false),
];
