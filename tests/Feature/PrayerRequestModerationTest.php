<?php

namespace Tests\Feature;

use App\Models\Church;
use App\Models\PrayerRequest;
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

    public function test_anonymous_prayer_request_can_be_submitted_without_name(): void
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
                'is_anonymous' => true,
                'request' => 'Peço oração pela minha família.',
            ])
            ->assertRedirect(route('prayer.index'))
            ->assertSessionHas('success');

        $this->assertDatabaseHas('prayer_requests', [
            'church_id' => $church->id,
            'user_id' => $user->id,
            'name_or_nickname' => '',
            'is_anonymous' => 1,
            'active' => 1,
        ]);
    }

    public function test_prayer_request_can_be_submitted_without_name_when_not_anonymous(): void
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
                'is_anonymous' => false,
                'request' => 'Peço oração pela igreja.',
            ])
            ->assertRedirect(route('prayer.index'))
            ->assertSessionHas('success');

        $this->assertDatabaseHas('prayer_requests', [
            'church_id' => $church->id,
            'user_id' => $user->id,
            'name_or_nickname' => '',
            'is_anonymous' => 0,
            'active' => 1,
        ]);
    }

    public function test_prayer_list_shows_only_last_two_months(): void
    {
        $this->seed(ChurchSeeder::class);
        $church = Church::query()->firstOrFail();

        $recent = PrayerRequest::query()->create([
            'church_id' => $church->id,
            'name_or_nickname' => 'Recente',
            'request' => 'Pedido recente',
            'is_anonymous' => false,
            'active' => true,
            'needs_review' => false,
        ]);
        $recent->created_at = now()->subMonth();
        $recent->save();

        $old = PrayerRequest::query()->create([
            'church_id' => $church->id,
            'name_or_nickname' => 'Antigo',
            'request' => 'Pedido antigo',
            'is_anonymous' => false,
            'active' => true,
            'needs_review' => false,
        ]);
        $old->created_at = now()->startOfMonth()->subMonths(2);
        $old->save();

        $this->withSession(['working_church_id' => $church->id])
            ->get(route('mobile.prayer'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Prayer/Mobile')
                ->has('requests', 1)
                ->where('requests.0.id', $recent->id));

        $this->withSession(['working_church_id' => $church->id])
            ->get(route('prayer.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Prayer/Index')
                ->has('requests', 1)
                ->where('requests.0.id', $recent->id));
    }
}

