<?php

namespace Tests\Feature;

use App\Models\Church;
use App\Models\MissionEvent;
use App\Models\User;
use Database\Seeders\ChurchSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class MissionHubTest extends TestCase
{
    use RefreshDatabase;

    public function test_mobile_mission_hub_renders_cards(): void
    {
        $this->seed(ChurchSeeder::class);
        $church = Church::query()->firstOrFail();

        $this->withSession(['working_church_id' => $church->id])
            ->get(route('mobile.mission'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Mobile/MissionHub')
                ->has('cards', 6));
    }

    public function test_mobile_mission_home_renders(): void
    {
        $this->seed(ChurchSeeder::class);
        $church = Church::query()->firstOrFail();

        $this->withSession(['working_church_id' => $church->id])
            ->get(route('mobile.mission.home'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('Mobile/MissionHome'));
    }

    public function test_mission_event_appears_on_mobile_list(): void
    {
        $this->seed(ChurchSeeder::class);
        $church = Church::query()->firstOrFail();

        MissionEvent::create([
            'church_id' => $church->id,
            'title' => 'Encontro missionário',
            'description' => 'Reunião da equipe',
            'starts_at' => now()->addDays(3),
        ]);

        $this->withSession(['working_church_id' => $church->id])
            ->get(route('mobile.mission.events'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Mobile/MissionEvents')
                ->has('events', 1)
                ->where('events.0.title', 'Encontro missionário'));
    }

    public function test_mobile_mission_events_hides_past_dates(): void
    {
        $this->seed(ChurchSeeder::class);
        $church = Church::query()->firstOrFail();

        MissionEvent::create([
            'church_id' => $church->id,
            'title' => 'Sent Care',
            'description' => 'Cantar no hospital (sábado).',
            'starts_at' => now()->subDays(5)->startOfDay(),
            'all_day' => true,
        ]);

        MissionEvent::create([
            'church_id' => $church->id,
            'title' => 'Ação Kids — Sent Quiz 2026',
            'starts_at' => now()->addDays(10)->startOfDay(),
            'all_day' => true,
        ]);

        $this->withSession(['working_church_id' => $church->id])
            ->get(route('mobile.mission.events'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Mobile/MissionEvents')
                ->has('events', 1)
                ->where('events.0.title', 'Ação Kids — Sent Quiz 2026')
                ->where('events', fn ($events) => collect($events)->every(
                    fn ($event) => $event['title'] !== 'Sent Care',
                )));
    }

    public function test_mobile_mission_events_hides_event_that_started_yesterday_even_if_it_ends_today(): void
    {
        $this->seed(ChurchSeeder::class);
        $church = Church::query()->firstOrFail();

        MissionEvent::create([
            'church_id' => $church->id,
            'title' => 'Missão 360°',
            'starts_at' => now()->subDay()->startOfDay(),
            'ends_at' => now()->endOfDay(),
            'all_day' => true,
        ]);

        MissionEvent::create([
            'church_id' => $church->id,
            'title' => 'Ação Resgate — Penitenciária',
            'starts_at' => now()->startOfDay(),
            'all_day' => true,
        ]);

        $this->withSession(['working_church_id' => $church->id])
            ->get(route('mobile.mission.events'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Mobile/MissionEvents')
                ->has('events', 1)
                ->where('events.0.title', 'Ação Resgate — Penitenciária')
                ->where('events', fn ($events) => collect($events)->every(
                    fn ($event) => $event['title'] !== 'Missão 360°',
                )));
    }

    public function test_mission_day_inherits_description_from_sibling_event_on_mobile(): void
    {
        $this->seed(ChurchSeeder::class);
        $church = Church::query()->firstOrFail();

        MissionEvent::query()->create([
            'church_id' => $church->id,
            'title' => 'Mission Day Nova Semente - Teste NS',
            'description' => 'Programação especial com todas as informações para o público.',
            'starts_at' => now()->addWeeks(2)->startOfDay(),
            'all_day' => true,
        ]);

        MissionEvent::query()->create([
            'church_id' => $church->id,
            'title' => 'Mission Day',
            'description' => null,
            'starts_at' => now()->addWeeks(4)->startOfDay(),
            'all_day' => true,
        ]);

        $this->withSession(['working_church_id' => $church->id])
            ->get(route('mobile.mission.events'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Mobile/MissionEvents')
                ->where('events', fn ($events) => collect($events)->contains(
                    fn ($event) => $event['title'] === 'Mission Day'
                        && str_contains((string) $event['description'], 'Programação especial'),
                )));
    }

    public function test_mission_day_inherits_color_from_sibling_event_on_mobile(): void
    {
        $this->seed(ChurchSeeder::class);
        $church = Church::query()->firstOrFail();

        MissionEvent::query()->create([
            'church_id' => $church->id,
            'title' => 'Mission Day Nova Semente - Teste NS',
            'color' => '#D97706',
            'image_url' => '/media/events/mission-day.jpg',
            'starts_at' => now()->addWeeks(2)->startOfDay(),
            'all_day' => true,
        ]);

        MissionEvent::query()->create([
            'church_id' => $church->id,
            'title' => 'Mission Day',
            'color' => '#0D9488',
            'starts_at' => now()->addWeeks(4)->startOfDay(),
            'all_day' => true,
        ]);

        $this->withSession(['working_church_id' => $church->id])
            ->get(route('mobile.mission.events'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Mobile/MissionEvents')
                ->where('events', fn ($events) => collect($events)->contains(
                    fn ($event) => $event['title'] === 'Mission Day'
                        && $event['color'] === '#D97706',
                )));
    }

    public function test_mission_day_keeps_custom_color_when_explicitly_configured(): void
    {
        $this->seed(ChurchSeeder::class);
        $church = Church::query()->firstOrFail();

        MissionEvent::query()->create([
            'church_id' => $church->id,
            'title' => 'Mission Day Nova Semente - Teste NS',
            'color' => '#D97706',
            'starts_at' => now()->addWeeks(2)->startOfDay(),
            'all_day' => true,
        ]);

        MissionEvent::query()->create([
            'church_id' => $church->id,
            'title' => 'Mission Day',
            'color' => '#EA580C',
            'starts_at' => now()->addWeeks(4)->startOfDay(),
            'all_day' => true,
        ]);

        $this->withSession(['working_church_id' => $church->id])
            ->get(route('mobile.mission.events'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Mobile/MissionEvents')
                ->where('events', fn ($events) => collect($events)->contains(
                    fn ($event) => $event['title'] === 'Mission Day'
                        && $event['color'] === '#EA580C',
                )));
    }

    public function test_authenticated_user_can_post_mission_message(): void
    {
        $this->seed(ChurchSeeder::class);
        $church = Church::query()->firstOrFail();
        $user = User::factory()->create(['church_id' => $church->id]);

        config(['mission.message_moderation.enabled' => false]);

        $this->actingAs($user)
            ->withSession(['working_church_id' => $church->id])
            ->post(route('mobile.mission.messages.store'), ['body' => 'Olá, equipe missionária!'])
            ->assertRedirect(route('mobile.mission.messages'));

        $this->assertDatabaseHas('mission_messages', [
            'church_id' => $church->id,
            'user_id' => $user->id,
            'body' => 'Olá, equipe missionária!',
            'moderation_status' => 'published',
        ]);
    }

    public function test_mission_manager_can_create_event(): void
    {
        Storage::fake('public');
        $this->seed([ChurchSeeder::class, RolePermissionSeeder::class]);
        $church = Church::query()->firstOrFail();
        $admin = User::factory()->create(['church_id' => $church->id]);
        $admin->givePermissionTo('mission.manage');

        $this->actingAs($admin)
            ->withSession(['working_church_id' => $church->id])
            ->post(route('mission.content.events.store'), [
                'title' => 'Retiro',
                'starts_at' => now()->addWeek()->format('Y-m-d\TH:i'),
                'color' => '#2563EB',
            ])
            ->assertRedirect(route('mission.content.events'));

        $this->assertDatabaseHas('mission_events', [
            'church_id' => $church->id,
            'title' => 'Retiro',
            'color' => '#2563EB',
        ]);
    }

    #[DataProvider('missionAdminContentTabProvider')]
    public function test_mission_admin_content_tabs_render(string $url, string $routeName, string $component): void
    {
        $this->seed([ChurchSeeder::class, RolePermissionSeeder::class]);
        $church = Church::query()->firstOrFail();
        $viewer = User::factory()->create(['church_id' => $church->id]);
        $viewer->givePermissionTo('mission.view');

        $this->actingAs($viewer)
            ->withSession(['working_church_id' => $church->id])
            ->get($url)
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component($component));

        $req = \Illuminate\Http\Request::create($url, 'GET');
        $matched = app('router')->getRoutes()->match($req);
        $this->assertSame($routeName, $matched->getName());
    }

    public static function missionAdminContentTabProvider(): array
    {
        return [
            'eventos' => ['/missao/gestao/eventos', 'mission.content.events', 'Mission/Events'],
            'depoimentos' => ['/missao/gestao/recados', 'mission.content.messages', 'Mission/Messages'],
            'quem-somos' => ['/missao/gestao/quem-somos', 'mission.content.about', 'Mission/About'],
            'mural' => ['/missao/gestao/mural', 'mission.content.wall', 'Mission/Wall'],
        ];
    }
}
