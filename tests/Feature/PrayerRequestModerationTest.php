<?php

namespace Tests\Feature;

use App\Models\Church;
use App\Models\User;
use Database\Seeders\ChurchSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class PrayerRequestModerationTest extends TestCase
{
    use RefreshDatabase;

    public function test_clean_prayer_request_is_published_immediately(): void
    {
        Http::fake([
            'api.openai.com/*' => Http::response([
                'results' => [['flagged' => false, 'categories' => []]],
            ]),
        ]);

        config([
            'prayer.request_moderation.enabled' => true,
            'prayer.request_moderation.openai_api_key' => 'test-key',
        ]);

        $this->seed(ChurchSeeder::class);
        $church = Church::query()->firstOrFail();
        $user = User::factory()->create(['church_id' => $church->id]);

        $this->actingAs($user)
            ->withSession(['working_church_id' => $church->id])
            ->post(route('prayer.store'), [
                'name_or_nickname' => 'Maria',
                'request' => 'Por favor, orem pela minha família.',
            ])
            ->assertRedirect(route('prayer.index'))
            ->assertSessionHas('success');

        $this->assertDatabaseHas('prayer_requests', [
            'church_id' => $church->id,
            'user_id' => $user->id,
            'active' => 1,
            'needs_review' => 0,
        ]);
    }

    public function test_flagged_prayer_request_goes_to_review_and_is_not_public(): void
    {
        Http::fake([
            'api.openai.com/*' => Http::response([
                'results' => [[
                    'flagged' => true,
                    'categories' => ['harassment' => true],
                ]],
            ]),
        ]);

        config([
            'prayer.request_moderation.enabled' => true,
            'prayer.request_moderation.openai_api_key' => 'test-key',
        ]);

        $this->seed(ChurchSeeder::class);
        $church = Church::query()->firstOrFail();
        $user = User::factory()->create(['church_id' => $church->id]);

        $this->actingAs($user)
            ->withSession(['working_church_id' => $church->id])
            ->post(route('prayer.store'), [
                'name_or_nickname' => 'José',
                'request' => 'mensagem ofensiva de teste',
            ])
            ->assertRedirect(route('prayer.index'))
            ->assertSessionHas('info');

        $this->assertDatabaseHas('prayer_requests', [
            'church_id' => $church->id,
            'user_id' => $user->id,
            'active' => 0,
            'needs_review' => 1,
        ]);

        $this->withSession(['working_church_id' => $church->id])
            ->get(route('mobile.prayer'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Prayer/Mobile')
                ->has('requests', 0));
    }
}

