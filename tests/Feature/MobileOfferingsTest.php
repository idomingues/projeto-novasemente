<?php

namespace Tests\Feature;

use App\Models\Church;
use App\Support\GivingLinks;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MobileOfferingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_sees_tithe_and_offering_7me_links(): void
    {
        $this->seed();

        $this->get(route('mobile.offerings'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Mobile/Offerings')
                ->where('donation.donation_url', GivingLinks::TITHE_FALLBACK_URL)
                ->where('offeringUrl', GivingLinks::OFFERING_URL)
            );
    }

    public function test_offerings_page_keeps_official_7me_links_even_with_church_donation_url(): void
    {
        $this->seed();

        $church = Church::query()->firstOrFail();
        $church->update(['donation_url' => 'https://giving.7me.app/custom-tithe']);

        $this->get(route('mobile.offerings'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Mobile/Offerings')
                ->where('donation.donation_url', GivingLinks::TITHE_FALLBACK_URL)
                ->where('offeringUrl', GivingLinks::OFFERING_URL)
            );
    }
}
