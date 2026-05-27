<?php

namespace App\Support;

final class PrayerRequestModerationResult
{
    public function __construct(
        public readonly bool $requiresReview,
        public readonly ?string $reason = null,
        public readonly string $source = 'disabled',
    ) {}
}

