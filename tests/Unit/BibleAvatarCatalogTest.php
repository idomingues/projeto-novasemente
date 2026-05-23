<?php

namespace Tests\Unit;

use App\Support\BibleAvatarCatalog;
use Tests\TestCase;

class BibleAvatarCatalogTest extends TestCase
{
    public function test_has_at_least_ten_avatars_per_gender(): void
    {
        $this->assertGreaterThanOrEqual(10, count(BibleAvatarCatalog::forGender('male')));
        $this->assertGreaterThanOrEqual(10, count(BibleAvatarCatalog::forGender('female')));
    }

    public function test_url_for_valid_key(): void
    {
        $url = BibleAvatarCatalog::urlForKey('male:david');
        $this->assertNotNull($url);
        $this->assertStringContainsString('bible-avatars/male/david.svg', $url);
    }

    public function test_rejects_unknown_key(): void
    {
        $this->assertFalse(BibleAvatarCatalog::isValidKey('male:unknown'));
    }
}
