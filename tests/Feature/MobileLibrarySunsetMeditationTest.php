<?php

namespace Tests\Feature;

use App\Models\Church;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MobileLibrarySunsetMeditationTest extends TestCase
{
    use RefreshDatabase;

    public function test_mobile_endpoint_returns_nearest_friday_segment(): void
    {
        $this->seed();

        $church = Church::query()->firstOrFail();
        $segments = [
            [
                'slug' => '2026-06-19',
                'label' => '19 jun',
                'date' => '2026-06-19',
                'html' => '<p>Meditação de 19 de junho.</p>',
            ],
            [
                'slug' => '2026-06-26',
                'label' => '26 jun',
                'date' => '2026-06-26',
                'html' => '<p>Meditação de 26 de junho.</p>',
            ],
        ];

        $church->update([
            'library_sunset_meditation_pdf_path' => 'library/sunset-meditation/'.$church->id.'/test.pdf',
            'library_sunset_meditation_segments' => $segments,
            'library_sunset_meditation_year' => 2026,
        ]);

        $response = $this
            ->withSession(['working_church_id' => $church->id])
            ->getJson(route('mobile.biblioteca.config-external-content', ['type' => 'sunset_meditation']));

        $response->assertOk();
        $response->assertJson([
            'ok' => true,
            'default_index' => 1,
            'html' => '<p>Meditação de 26 de junho.</p>',
        ]);
        $response->assertJsonCount(2, 'segments');
    }

    public function test_mobile_endpoint_requires_configured_pdf(): void
    {
        $this->seed();

        $churchId = (int) Church::query()->value('id');

        $this
            ->withSession(['working_church_id' => $churchId])
            ->getJson(route('mobile.biblioteca.config-external-content', ['type' => 'sunset_meditation']))
            ->assertStatus(422)
            ->assertJson(['ok' => false]);
    }
}
