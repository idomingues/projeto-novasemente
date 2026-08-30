<?php

namespace Tests\Feature;

use App\Models\AppNovelty;
use App\Models\Church;
use App\Models\User;
use App\Models\UserDismissedAppNovelty;
use Database\Seeders\ChurchSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AppNoveltyTest extends TestCase
{
    use RefreshDatabase;

    private Church $church;

    private User $admin;

    private User $member;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);
        $this->seed(ChurchSeeder::class);

        $this->church = Church::query()->firstOrFail();
        $this->admin = User::factory()->create(['church_id' => $this->church->id]);
        $this->admin->assignRole('admin');
        $this->member = User::factory()->create(['church_id' => $this->church->id]);
        $this->member->assignRole('membro');
    }

    private function actingAsAdmin()
    {
        return $this->actingAs($this->admin)->withSession(['working_church_id' => $this->church->id]);
    }

    private function actingAsMember()
    {
        return $this->actingAs($this->member)->withSession(['working_church_id' => $this->church->id]);
    }

    public function test_admin_can_publish_novelty(): void
    {
        $this->actingAsAdmin()
            ->post(route('app-novelties.store'), [
                'title' => 'Conheça o NS Conecta',
                'body' => 'Converse com departamentos, líderes e voluntários.',
                'module_key' => 'ns_whats',
                'is_active' => true,
            ])
            ->assertRedirect(route('app-novelties.index', [
                'modal' => 'edit',
                'id' => AppNovelty::query()->value('id'),
            ]));

        $this->assertDatabaseHas('app_novelties', [
            'church_id' => $this->church->id,
            'title' => 'Conheça o NS Conecta',
            'module_key' => 'ns_whats',
            'route_name' => 'mobile.ns-whats.index',
            'is_active' => true,
        ]);
    }

    public function test_module_key_is_required(): void
    {
        $this->actingAsAdmin()
            ->from(route('app-novelties.index'))
            ->post(route('app-novelties.store'), [
                'title' => 'Sem destino',
                'body' => 'Falta escolher o módulo.',
                'module_key' => '',
                'is_active' => true,
            ])
            ->assertSessionHasErrors('module_key');
    }

    public function test_member_home_shows_pending_novelty(): void
    {
        $this->actingAsAdmin()
            ->post(route('app-novelties.store'), [
                'title' => 'Novidade na Home',
                'body' => 'Veja o que mudou no início.',
                'module_key' => 'home',
                'is_active' => true,
            ])
            ->assertRedirect();

        $this->actingAsMember()
            ->get(route('mobile.home'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Mobile/Home')
                ->where('pendingAppNovelty.title', 'Novidade na Home')
                ->where('pendingAppNovelty.module_key', 'home')
                ->where('pendingAppNovelty.module_label', 'Início'));
    }

    public function test_guest_home_does_not_show_novelty(): void
    {
        AppNovelty::query()->create([
            'church_id' => $this->church->id,
            'title' => 'Só para membros',
            'body' => 'Faça login para ver.',
            'module_key' => 'home',
            'route_name' => 'mobile.home',
            'is_active' => true,
            'published_at' => now(),
            'created_by' => $this->admin->id,
        ]);

        $this->get(route('mobile.home'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Mobile/Home')
                ->where('pendingAppNovelty', null));
    }

    public function test_disabled_feature_skips_novelty(): void
    {
        $this->church->update(['disabled_app_features' => ['polls']]);

        AppNovelty::query()->create([
            'church_id' => $this->church->id,
            'title' => 'Vote na enquete',
            'body' => 'A enquete da semana já está no ar.',
            'module_key' => 'polls',
            'route_name' => 'mobile.polls.index',
            'is_active' => true,
            'published_at' => now(),
            'created_by' => $this->admin->id,
        ]);

        $this->actingAsMember()
            ->get(route('mobile.home'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Mobile/Home')
                ->where('pendingAppNovelty', null));
    }

    public function test_dismiss_removes_novelty_from_home(): void
    {
        $novelty = AppNovelty::query()->create([
            'church_id' => $this->church->id,
            'title' => 'Descartável',
            'body' => 'Toque em agora não.',
            'module_key' => 'home',
            'route_name' => 'mobile.home',
            'is_active' => true,
            'published_at' => now(),
            'created_by' => $this->admin->id,
        ]);

        $this->actingAsMember()
            ->postJson(route('mobile.app-novelties.dismiss', $novelty))
            ->assertOk()
            ->assertJson(['ok' => true]);

        $this->assertDatabaseHas('user_dismissed_app_novelties', [
            'user_id' => $this->member->id,
            'app_novelty_id' => $novelty->id,
        ]);

        $this->actingAsMember()
            ->get(route('mobile.home'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Mobile/Home')
                ->where('pendingAppNovelty', null));
    }

    public function test_queue_shows_next_after_dismiss(): void
    {
        $older = AppNovelty::query()->create([
            'church_id' => $this->church->id,
            'title' => 'Mais antiga',
            'body' => 'Primeira da fila depois.',
            'module_key' => 'publications',
            'route_name' => 'mobile.publications-feed',
            'is_active' => true,
            'published_at' => now()->subDay(),
            'created_by' => $this->admin->id,
        ]);
        $newer = AppNovelty::query()->create([
            'church_id' => $this->church->id,
            'title' => 'Mais recente',
            'body' => 'Aparece primeiro.',
            'module_key' => 'home',
            'route_name' => 'mobile.home',
            'is_active' => true,
            'published_at' => now(),
            'created_by' => $this->admin->id,
        ]);

        $this->actingAsMember()
            ->get(route('mobile.home'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('pendingAppNovelty.id', $newer->id)
                ->where('pendingAppNovelty.title', 'Mais recente'));

        UserDismissedAppNovelty::query()->create([
            'user_id' => $this->member->id,
            'app_novelty_id' => $newer->id,
        ]);

        $this->actingAsMember()
            ->get(route('mobile.home'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('pendingAppNovelty.id', $older->id)
                ->where('pendingAppNovelty.title', 'Mais antiga'));
    }

    public function test_member_cannot_open_publisher(): void
    {
        $this->actingAsMember()
            ->get(route('app-novelties.index'))
            ->assertForbidden();
    }

    public function test_secretaria_can_open_publisher(): void
    {
        $secretaria = User::factory()->create(['church_id' => $this->church->id]);
        $secretaria->assignRole('secretaria');

        $this->actingAs($secretaria)
            ->withSession(['working_church_id' => $this->church->id])
            ->get(route('app-novelties.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('AppNovelties/Index'));
    }
}
