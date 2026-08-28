<?php

namespace Tests\Feature;

use App\Models\Church;
use App\Support\GivingLinks;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OfferingLandingTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_can_open_oferta_landing_with_default_7me_links(): void
    {
        $this->seed();

        $this->get(route('oferta'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('OfferingLanding')
                ->where('titheUrl', GivingLinks::TITHE_FALLBACK_URL)
                ->where('offeringUrl', GivingLinks::OFFERING_URL)
                ->where('churchName', 'Nova Semente')
            );
    }

    public function test_landing_uses_church_donation_url_for_tithe(): void
    {
        $this->seed();

        $church = Church::query()->firstOrFail();
        $church->update(['donation_url' => 'https://giving.7me.app/custom-tithe']);

        $this->get(route('oferta'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('OfferingLanding')
                ->where('titheUrl', 'https://giving.7me.app/custom-tithe')
                ->where('offeringUrl', GivingLinks::OFFERING_URL)
            );
    }
}
