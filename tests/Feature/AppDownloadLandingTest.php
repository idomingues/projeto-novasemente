<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AppDownloadLandingTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_can_open_app_download_landing_with_store_urls(): void
    {
        $this->seed();

        $this->get(route('app.download'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('AppDownloadLanding')
                ->where('churchName', 'Nova Semente')
                ->where('iosAppStoreUrl', config('services.ios_app_store_url'))
                ->where('androidPlayStoreUrl', config('services.android_play_store_url'))
            );
    }

    public function test_mobile_home_shares_store_urls_for_get_the_app_banner(): void
    {
        $this->seed();

        $this->get(route('mobile.home'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Mobile/Home')
                ->where('iosAppStoreUrl', config('services.ios_app_store_url'))
                ->where('androidPlayStoreUrl', config('services.android_play_store_url'))
            );
    }

    public function test_baixe_and_baixar_redirect_to_app_landing(): void
    {
        $this->get('/baixe')->assertRedirect('/app');
        $this->get('/baixar')->assertRedirect('/app');
    }
}
