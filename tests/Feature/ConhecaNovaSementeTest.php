<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ConhecaNovaSementeTest extends TestCase
{
    use RefreshDatabase;

    public function test_hub_page_renders(): void
    {
        $this->seed();

        $this->get(route('mobile.conheca'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('Mobile/ConhecaNovaSemente'));
    }

    public function test_child_pages_still_render(): void
    {
        $this->seed();

        $this->get(route('mobile.quem-somos'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('Mobile/QuemSomos'));

        $this->get(route('mobile.beliefs'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('Mobile/Beliefs'));

        $this->get(route('mobile.location'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('Mobile/Location'));
    }
}
