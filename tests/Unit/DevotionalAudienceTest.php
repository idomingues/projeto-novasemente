<?php

namespace Tests\Unit;

use App\Models\Church;
use App\Support\DevotionalAudience;
use Tests\TestCase;

class DevotionalAudienceTest extends TestCase
{
    public function test_normalizes_and_maps_default_urls(): void
    {
        $this->assertSame(DevotionalAudience::ADULTOS, DevotionalAudience::normalize('Adultos'));
        $this->assertSame(DevotionalAudience::MULHERES, DevotionalAudience::normalize('mulheres'));
        $this->assertSame(DevotionalAudience::JOVENS, DevotionalAudience::normalize('jovens'));
        $this->assertSame(DevotionalAudience::DEFAULT, DevotionalAudience::normalize('xyz'));

        $this->assertSame(DevotionalAudience::URL_ADULTOS, DevotionalAudience::defaultUrl('adultos'));
        $this->assertSame(DevotionalAudience::URL_MULHERES, DevotionalAudience::defaultUrl('mulheres'));
        $this->assertSame(DevotionalAudience::URL_JOVENS, DevotionalAudience::defaultUrl('jovens'));
    }

    public function test_church_uses_custom_url_only_for_adultos(): void
    {
        $church = new Church([
            'library_meditation_url' => 'https://example.com/custom-adult/',
        ]);

        $this->assertSame('https://example.com/custom-adult/', $church->resolvedLibraryMeditationUrlForAudience('adultos'));
        $this->assertSame(DevotionalAudience::URL_MULHERES, $church->resolvedLibraryMeditationUrlForAudience('mulheres'));
        $this->assertSame(DevotionalAudience::URL_JOVENS, $church->resolvedLibraryMeditationUrlForAudience('jovens'));
    }

    public function test_from_request_prefers_query_then_cookie(): void
    {
        $withQuery = \Illuminate\Http\Request::create('/mobile/meditacao-diaria', 'GET', ['audience' => 'jovens']);
        $withQuery->cookies->set('ns_devotional_audience', 'mulheres');
        $this->assertSame(DevotionalAudience::JOVENS, DevotionalAudience::fromRequest($withQuery));

        $withCookie = \Illuminate\Http\Request::create('/mobile/meditacao-diaria', 'GET');
        $withCookie->cookies->set('ns_devotional_audience', 'mulheres');
        $this->assertSame(DevotionalAudience::MULHERES, DevotionalAudience::fromRequest($withCookie));

        $empty = \Illuminate\Http\Request::create('/mobile/meditacao-diaria', 'GET');
        $this->assertSame(DevotionalAudience::DEFAULT, DevotionalAudience::fromRequest($empty));
    }
}
