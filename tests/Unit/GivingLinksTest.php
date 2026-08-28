<?php

namespace Tests\Unit;

use App\Models\Church;
use App\Support\GivingLinks;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class GivingLinksTest extends TestCase
{
    #[Test]
    public function tithe_url_falls_back_when_church_has_no_custom_link(): void
    {
        $this->assertSame(GivingLinks::TITHE_FALLBACK_URL, GivingLinks::titheUrl(null));
        $this->assertSame(GivingLinks::TITHE_FALLBACK_URL, GivingLinks::titheUrl(new Church(['donation_url' => '  '])));
    }

    #[Test]
    public function tithe_url_uses_church_donation_url(): void
    {
        $church = new Church(['donation_url' => 'https://giving.7me.app/custom']);

        $this->assertSame('https://giving.7me.app/custom', GivingLinks::titheUrl($church));
    }

    #[Test]
    public function offering_url_switches_caixa_fixo_variant(): void
    {
        $this->assertSame(GivingLinks::OFFERING_URL, GivingLinks::offeringUrl());
        $this->assertSame(GivingLinks::OFFERING_CAIXA_FIXO_URL, GivingLinks::offeringUrl(true));
    }
}
