<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AppDownloadLandingTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_can_open_app_download_landing_with_store_links(): void
    {
        $this->seed();

        $this->get(route('app'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('AppDownloadLanding')
                ->where('churchName', 'Nova Semente')
                ->where('iosAppStoreUrl', 'https://apps.apple.com/br/app/nova-semente/id734369457')
                ->where('androidPlayStoreUrl', 'https://play.google.com/store/apps/details?id=br.org.novasemente.app')
            );
    }

    public function test_baixar_redirects_to_app_landing(): void
    {
        $this->get(route('baixar'))
            ->assertRedirect(route('app'));
    }
}
